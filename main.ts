import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, normalizePath, MarkdownPostProcessorContext, Modal, MarkdownView, Editor, Menu, requestUrl } from 'obsidian';
import { I18N_DICT, Language } from './i18n';

interface WidgetPluginSettings {
    galleryPath: string;
    language: Language;
    githubUrl: string;
}

const DEFAULT_SETTINGS: WidgetPluginSettings = {
    galleryPath: '.obsidian/plugins/obsidian-obsidget/gallery',
    language: 'en',
    githubUrl: 'https://github.com/infinition/obsidian-obsidget'
};

interface WidgetTemplate {
    id: string;
    name: string;
    html: string;
    css: string;
    js: string;
    tags?: string[];
}

export default class WidgetPlugin extends Plugin {
    settings: WidgetPluginSettings;

    t(key: keyof typeof I18N_DICT['en'], ...args: any[]): string {
        const lang = this.settings.language || 'en';
        let text = I18N_DICT[lang][key] || I18N_DICT['en'][key] || key;

        args.forEach((arg, i) => {
            text = text.replace(`{${i}}`, String(arg));
        });

        return text;
    }

    async onload() {
        await this.loadSettings();

        // Ensure directories exist
        await this.ensureDirectory(this.settings.galleryPath);

        this.addSettingTab(new WidgetSettingTab(this.app, this));

        // Ribbon icon to open gallery
        this.addRibbonIcon('layout', this.t('galleryTitle'), () => {
            new WidgetGalleryModal(this.app, this).open();
        });

        // Command to open gallery
        this.addCommand({
            id: 'open-widget-gallery',
            name: this.t('galleryTitle'),
            callback: () => {
                new WidgetGalleryModal(this.app, this).open();
            }
        });

        // Context menu integration
        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
                menu.addItem((item) => {
                    item
                        .setTitle(this.t('insertWidgetMenu'))
                        .setIcon("layout")
                        .onClick(async () => {
                            new WidgetGalleryModal(this.app, this, editor).open();
                        });
                });
            })
        );

        this.registerMarkdownCodeBlockProcessor('widget', async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
            const sections = source.split('---');
            let firstSection = sections[0].trim();
            let widgetId = '';
            let htmlContent = '';
            let cssContent = sections[1] || '';
            let jsContent = sections[2] || '';
            let inlineDataStr = sections[3]?.trim();
            let isLinked = false;

            // Helper to sanitize ID
            const sanitizeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '');

            // Parse ID from first line if present
            if (firstSection.startsWith('ID:')) {
                const lines = firstSection.split('\n');
                widgetId = sanitizeId(lines[0].replace('ID:', '').trim());
                htmlContent = lines.slice(1).join('\n').trim();
            } else {
                htmlContent = firstSection;
            }

            // If HTML is empty but we have an ID, try to load from gallery
            if (!htmlContent && widgetId) {
                isLinked = true;
                const galleryPath = normalizePath(`${this.settings.galleryPath}/${widgetId}.json`);
                try {
                    if (await this.app.vault.adapter.exists(galleryPath)) {
                        const content = await this.app.vault.adapter.read(galleryPath);
                        const template: WidgetTemplate = JSON.parse(content);
                        htmlContent = template.html;
                        // Only override if not provided in the block
                        if (!cssContent) cssContent = template.css;
                        if (!jsContent) jsContent = template.js;
                    } else {
                        htmlContent = `<div class="mod-warning">Widget "${widgetId}" not found in gallery.</div>`;
                    }
                } catch (e) {
                    console.error(`Error loading widget "${widgetId}" from ${galleryPath}:`, e);
                    htmlContent = `<div class="mod-warning">Error loading widget "${widgetId}": ${e.message}</div>`;
                }
            }

            const sectionInfo = ctx.getSectionInfo(el);
            const lineStart = sectionInfo?.lineStart || 0;
            const filePath = ctx.sourcePath;

            const instanceId = widgetId || `${filePath.replace(/\//g, '_')}__line${lineStart}`;

            // Create widget container
            const container = el.createDiv({ cls: 'widget-instance-container' });

            // Action Buttons Container
            const btnContainer = container.createDiv({ cls: 'widget-action-buttons' });
            btnContainer.style.position = 'absolute';
            btnContainer.style.top = '10px';
            btnContainer.style.right = '10px';
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '5px';
            btnContainer.style.zIndex = '100';

            // Helper to create buttons
            const createBtn = (text: string, title: string, onClick: (e: MouseEvent) => void) => {
                const btn = btnContainer.createEl('button', { text, cls: 'widget-save-to-gallery-btn' });
                btn.title = title;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    onClick(e);
                };
                return btn;
            };

            if (isLinked) {
                // Edit Button for Linked Widgets
                createBtn('✏️', 'Edit this widget in gallery', () => {
                    const template: WidgetTemplate = {
                        id: widgetId,
                        name: widgetId,
                        html: htmlContent,
                        css: cssContent,
                        js: jsContent
                    };
                    new WidgetEditorModal(this.app, this, async (saved) => {
                        await this.saveToGallery(saved);
                        new Notice(`Widget "${saved.name}" updated!`);
                        // Refresh the view to show changes
                        this.app.workspace.trigger('layout-change');
                    }, template).open();
                });
            } else {
                // Save Button
                createBtn('💾', 'Save to gallery', () => {
                    const template: WidgetTemplate = {
                        id: widgetId || `widget_${Date.now()}`,
                        name: widgetId || 'New Widget',
                        html: htmlContent,
                        css: cssContent,
                        js: jsContent
                    };
                    new WidgetEditorModal(this.app, this, async (saved) => {
                        await this.saveToGallery(saved);
                        new Notice(`Widget "${saved.name}" saved to gallery!`);
                    }, template).open();
                });

                // Convert to Link Button
                createBtn('🔗', 'Convert to Linked Widget (Short Code)', async () => {
                    if (!widgetId) {
                        new Notice('Please save the widget with an ID first (or add ID: name to the block).');
                        return;
                    }

                    // Check if exists in gallery
                    const galleryPath = normalizePath(`${this.settings.galleryPath}/${widgetId}.json`);
                    if (!(await this.app.vault.adapter.exists(galleryPath))) {
                        new Notice(`Widget "${widgetId}" not found in gallery. Please save it first.`);
                        return;
                    }

                    // Replace code block
                    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                    if (view) {
                        const editor = view.editor;
                        const section = ctx.getSectionInfo(el);
                        if (section) {
                            const rangeStart = { line: section.lineStart, ch: 0 };
                            const rangeEnd = { line: section.lineEnd, ch: 0 };
                            const newContent = `\`\`\`widget\nID: ${widgetId}\n\`\`\``;
                            editor.replaceRange(newContent, rangeStart, rangeEnd);
                            new Notice('Converted to Linked Widget!');
                        }
                    }
                });
            }

            const shadow = container.attachShadow({ mode: 'open' });

            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                :host { display: block; position: relative; width: 100%; }
                ${cssContent}
            `;
            shadow.appendChild(style);

            const innerDiv = document.createElement('div');
            innerDiv.innerHTML = htmlContent;
            shadow.appendChild(innerDiv);

            // API for widget
            const api = {
                root: shadow,
                saveState: async (data: any) => {
                    const section = ctx.getSectionInfo(el);
                    if (section) {
                        const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
                        if (file instanceof TFile) {
                            const newDataStr = JSON.stringify(data, null, 2);
                            try {
                                await this.app.vault.process(file, (oldContent) => {
                                    const lines = oldContent.split('\n');
                                    if (section.lineStart + 1 >= lines.length || section.lineEnd > lines.length) return oldContent;

                                    const blockLines = lines.slice(section.lineStart + 1, section.lineEnd);
                                    const blockContent = blockLines.join('\n');
                                    const blockSections = blockContent.split('---');

                                    const currentDataStr = blockSections[3]?.trim() || "";
                                    if (newDataStr === currentDataStr) return oldContent;

                                    const newSections = [...blockSections];
                                    while (newSections.length < 3) newSections.push('\n');
                                    newSections[3] = `\n${newDataStr}\n`;

                                    const newBlockContent = newSections.join('---');
                                    lines.splice(section.lineStart + 1, section.lineEnd - section.lineStart - 1, newBlockContent);
                                    return lines.join('\n');
                                });
                                return;
                            } catch (e) {
                                console.error('Inline save failed:', e);
                            }
                        }
                    }
                },
                getState: async () => {
                    if (inlineDataStr) {
                        try {
                            return JSON.parse(inlineDataStr);
                        } catch (e) { }
                    }
                    return null;
                },
                instanceId: instanceId
            };

            // Execute JS
            try {
                const apiProxy = new Proxy(api as any, {
                    get(target, prop) {
                        if (prop in target) return target[prop];
                        return (window as any)[prop];
                    },
                    set(target, prop, value) {
                        target[prop] = value;
                        return true;
                    }
                });

                const scriptFunction = new Function('api', `with(api) { ${jsContent} }`);
                scriptFunction(apiProxy);
                this.bindEvents(shadow, apiProxy);
            } catch (e) {
                console.error('Widget JS Error:', e);
            }
        });
    }

    bindEvents(root: ShadowRoot | HTMLElement, apiProxy: any) {
        const elements = root.querySelectorAll('*');
        elements.forEach(el => {
            const attrs = (el as HTMLElement).attributes;
            if (!attrs) return;

            for (let i = 0; i < attrs.length; i++) {
                const attr = attrs[i];
                if (attr.name.startsWith('on') && attr.name !== 'on') {
                    const eventName = attr.name.substring(2);
                    const code = attr.value;

                    el.addEventListener(eventName, (e) => {
                        try {
                            const eventFunc = new Function('api', 'event', `with(api) { ${code} }`);
                            eventFunc(apiProxy, e);
                        } catch (err) {
                            console.error(`Error in widget event [${eventName}]:`, err);
                        }
                    });
                    (el as any)[attr.name] = null;
                }
            }
        });
    }

    async ensureDirectory(path: string) {
        if (!(await this.app.vault.adapter.exists(path))) {
            await this.app.vault.adapter.mkdir(path);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async getGalleryWidgets(): Promise<WidgetTemplate[]> {
        const exists = await this.app.vault.adapter.exists(this.settings.galleryPath);
        if (!exists) return [];

        const files = await this.app.vault.adapter.list(this.settings.galleryPath);
        const templates: WidgetTemplate[] = [];

        for (const filePath of files.files) {
            if (filePath.endsWith('.json')) {
                const content = await this.app.vault.adapter.read(filePath);
                try {
                    templates.push(JSON.parse(content));
                } catch (e) {
                    console.error(`Failed to parse gallery item: ${filePath}`, e);
                }
            }
        }
        return templates;
    }

    async saveToGallery(template: WidgetTemplate) {
        const filePath = normalizePath(`${this.settings.galleryPath}/${template.id}.json`);
        await this.app.vault.adapter.write(filePath, JSON.stringify(template, null, 2));
    }

    async deleteFromGallery(id: string) {
        const filePath = normalizePath(`${this.settings.galleryPath}/${id}.json`);
        if (await this.app.vault.adapter.exists(filePath)) {
            await this.app.vault.adapter.remove(filePath);
        }
    }

    async syncGallery() {
        try {
            const apiUrl = "https://api.github.com/repos/infinition/obsidian-obsidget/contents/gallery";
            const response = await requestUrl({ url: apiUrl });

            if (response.status !== 200) {
                throw new Error(`GitHub API returned ${response.status}`);
            }

            const files = response.json;
            let addedCount = 0;

            for (const file of files) {
                if (file.name.endsWith('.json')) {
                    const localPath = normalizePath(`${this.settings.galleryPath}/${file.name}`);

                    // Only download if it doesn't exist locally
                    if (!(await this.app.vault.adapter.exists(localPath))) {
                        const fileResponse = await requestUrl({ url: file.download_url });
                        if (fileResponse.status === 200) {
                            await this.app.vault.adapter.write(localPath, fileResponse.text);
                            addedCount++;
                        }
                    }
                }
            }

            new Notice(this.t('syncSuccess', addedCount));
        } catch (e) {
            console.error('Gallery sync failed:', e);
            new Notice(this.t('syncError', e.message));
        }
    }
}

class WidgetGalleryModal extends Modal {
    plugin: WidgetPlugin;
    searchQuery: string = "";
    currentPage: number = 1;
    itemsPerPage: number = 50;
    allTemplates: WidgetTemplate[] = [];
    filteredTemplates: WidgetTemplate[] = [];
    allTags: string[] = [];
    selectedTag: string = "";
    gridEl: HTMLElement;
    tagSelectEl: HTMLSelectElement;
    searchInputEl: HTMLInputElement;
    clearBtnEl: HTMLElement;
    isMobile: boolean;
    targetEditor: Editor | null = null;

    constructor(app: App, plugin: WidgetPlugin, editor?: Editor) {
        super(app);
        this.plugin = plugin;
        this.isMobile = (app as any).isMobile;
        this.targetEditor = editor || null;
    }

    async onOpen() {
        const { contentEl } = this;
        (this as any).modalEl.addClass('widget-gallery-modal');
        contentEl.empty();

        // Header
        const header = contentEl.createDiv({ cls: 'gallery-header' });
        header.createEl('h2', { text: this.plugin.t('galleryTitle') });
        const closeBtn = header.createEl('button', { text: '✕', cls: 'gallery-close-btn' });
        closeBtn.onclick = () => this.close();

        // Controls container
        const controlsContainer = contentEl.createDiv({ cls: 'gallery-controls' });

        // Search Bar with icon on right and clear button
        const searchContainer = controlsContainer.createDiv({ cls: 'gallery-search-container' });

        this.searchInputEl = searchContainer.createEl('input', {
            attr: { type: 'text', placeholder: this.plugin.t('searchPlaceholder') },
            cls: 'gallery-search-input'
        });
        this.searchInputEl.oninput = (e) => {
            this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
            this.updateClearButton();
            this.currentPage = 1;
            this.filterAndRender();
        };

        // Clear button
        this.clearBtnEl = searchContainer.createSpan({ cls: 'gallery-search-clear', text: '✕' });
        this.clearBtnEl.onclick = () => {
            this.searchInputEl.value = '';
            this.searchQuery = '';
            this.updateClearButton();
            this.currentPage = 1;
            this.filterAndRender();
        };
        this.updateClearButton();

        // Search icon (on right)
        searchContainer.createSpan({ cls: 'gallery-search-icon', text: '🔍' });

        // Tag dropdown
        const tagContainer = controlsContainer.createDiv({ cls: 'gallery-tag-container' });
        this.tagSelectEl = tagContainer.createEl('select', { cls: 'gallery-tag-select' });
        this.tagSelectEl.onchange = () => {
            this.selectedTag = this.tagSelectEl.value;
            this.currentPage = 1;
            this.filterAndRender();
        };

        // New Widget Button
        const addBtn = controlsContainer.createEl('button', { text: `+ ${this.plugin.t('addWidget')}`, cls: 'mod-cta gallery-add-btn' });
        addBtn.onclick = () => this.openWidgetEditor();

        // Grid
        this.gridEl = contentEl.createDiv({ cls: 'widget-gallery-grid' });

        // Load templates and extract tags
        this.allTemplates = await this.plugin.getGalleryWidgets();
        this.extractAllTags();
        this.populateTagDropdown();

        // Debug notification
        const msg = this.allTags.length > 0
            ? this.plugin.t('loadedMsg', this.allTemplates.length, this.allTags.length)
            : this.plugin.t('loadedNoTagsMsg', this.allTemplates.length);
        this.showToast(msg);

        this.filterAndRender();

        // Infinite Scroll for PC
        if (!this.isMobile) {
            contentEl.onscroll = () => {
                if (contentEl.scrollTop + contentEl.clientHeight >= contentEl.scrollHeight - 100) {
                    this.loadMore();
                }
            };
        }
    }

    showToast(message: string) {
        const toast = document.createElement('div');
        toast.className = 'gallery-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Force reflow
        void toast.offsetHeight;

        toast.classList.add('is-visible');
        setTimeout(() => {
            toast.classList.remove('is-visible');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    updateClearButton() {
        if (this.searchQuery.length > 0) {
            this.clearBtnEl.style.display = 'flex';
        } else {
            this.clearBtnEl.style.display = 'none';
        }
    }

    extractAllTags() {
        const tagSet = new Set<string>();
        this.allTemplates.forEach(t => {
            if (t.tags && Array.isArray(t.tags)) {
                t.tags.forEach(tag => tagSet.add(tag.toLowerCase().trim()));
            }
        });
        this.allTags = Array.from(tagSet).sort();
    }

    populateTagDropdown() {
        this.tagSelectEl.innerHTML = '';
        const allOption = document.createElement('option');
        allOption.value = "";
        allOption.textContent = `🏷️ ${this.plugin.t('allTags')}`;
        if (this.selectedTag === "") allOption.selected = true;
        this.tagSelectEl.appendChild(allOption);

        this.allTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
            if (this.selectedTag === tag) option.selected = true;
            this.tagSelectEl.appendChild(option);
        });
    }

    filterAndRender() {
        // Check if search query contains a tag search (#tagname)
        let searchText = this.searchQuery;
        let tagFromSearch = '';

        if (searchText.startsWith('#')) {
            const tagMatch = searchText.slice(1).trim();
            if (tagMatch.length > 0) {
                tagFromSearch = tagMatch;
                searchText = ''; // Clear text search when searching by tag
            }
        }

        const activeTag = tagFromSearch || this.selectedTag;

        this.filteredTemplates = this.allTemplates.filter(t => {
            // Search filter (only if not tag search)
            const matchesSearch = searchText.length === 0 ||
                t.name.toLowerCase().includes(searchText) ||
                t.id.toLowerCase().includes(searchText);

            // Tag filter (from dropdown or #search)
            const matchesTags = activeTag.length === 0 ||
                (t.tags && t.tags.some(tag => tag.toLowerCase().includes(activeTag)));

            return matchesSearch && matchesTags;
        });

        this.gridEl.empty();
        this.renderVisibleWidgets();
        this.renderPagination();
    }

    renderVisibleWidgets() {
        let toShow: WidgetTemplate[] = [];
        if (this.isMobile) {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            toShow = this.filteredTemplates.slice(start, start + this.itemsPerPage);
        } else {
            toShow = this.filteredTemplates.slice(0, this.currentPage * this.itemsPerPage);
        }

        if (toShow.length === 0 && this.currentPage === 1) {
            this.gridEl.createEl('p', { text: this.plugin.t('noResults'), cls: 'no-results' });
            return;
        }

        toShow.forEach(template => this.renderWidgetCard(template));
    }

    renderWidgetCard(template: WidgetTemplate) {
        const card = this.gridEl.createDiv({ cls: 'widget-card' });

        // Header with title
        const cardHeader = card.createDiv({ cls: 'widget-card-header' });
        cardHeader.createEl('h3', { text: template.name });

        // Tags display
        if (template.tags && template.tags.length > 0) {
            const tagsContainer = cardHeader.createDiv({ cls: 'widget-card-tags' });
            template.tags.slice(0, 3).forEach(tag => {
                tagsContainer.createSpan({ text: tag, cls: 'widget-tag' });
            });
            if (template.tags.length > 3) {
                tagsContainer.createSpan({ text: `+${template.tags.length - 3}`, cls: 'widget-tag more' });
            }
        }

        // Preview (non-interactive)
        const preview = card.createDiv({ cls: 'widget-preview' });
        const shadow = preview.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = `:host { display: block; padding: 10px; width: 100%; max-width: 100%; overflow: hidden; pointer-events: none; user-select: none; } * { pointer-events: none !important; max-width: 100%; box-sizing: border-box; } img, video, iframe { max-width: 100%; height: auto; } ${template.css}`;
        shadow.appendChild(style);

        const innerWrap = document.createElement('div');
        innerWrap.innerHTML = template.html;
        shadow.appendChild(innerWrap);

        // Actions
        const actions = card.createDiv({ cls: 'widget-card-actions' });
        const insertBtn = actions.createEl('button', { text: `📥 ${this.plugin.t('insert')}`, cls: 'mod-cta' });
        insertBtn.onclick = () => {
            this.insertWidget(template);
        };

        const editBtn = actions.createEl('button', { text: `✏️ ${this.plugin.t('edit')}` });
        editBtn.onclick = () => this.openWidgetEditor(template);

        const deleteBtn = actions.createEl('button', { text: '🗑️', cls: 'mod-warning' });
        deleteBtn.onclick = async () => {
            if (confirm(this.plugin.t('deleteConfirm'))) {
                await this.plugin.deleteFromGallery(template.id);
                new Notice(this.plugin.t('widgetDeleted'));
                this.allTemplates = await this.plugin.getGalleryWidgets();
                this.extractAllTags();
                this.populateTagDropdown();
                this.filterAndRender();
            }
        };
    }

    renderPagination() {
        const existingPagination = this.contentEl.querySelector('.gallery-pagination');
        if (existingPagination) existingPagination.remove();

        if (!this.isMobile) return;

        const totalPages = Math.ceil(this.filteredTemplates.length / this.itemsPerPage);
        if (totalPages <= 1) return;

        const pagination = this.contentEl.createDiv({ cls: 'gallery-pagination' });

        const prevBtn = pagination.createEl('button', { text: `← ${this.plugin.t('previous')}` });
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.onclick = () => {
            this.currentPage--;
            this.gridEl.empty();
            this.renderVisibleWidgets();
            this.renderPagination();
            this.contentEl.scrollTop = 0;
        };

        pagination.createSpan({ text: ` ${this.plugin.t('pageInfo', this.currentPage, totalPages)} ` });

        const nextBtn = pagination.createEl('button', { text: `${this.plugin.t('next')} →` });
        nextBtn.disabled = this.currentPage === totalPages;
        nextBtn.onclick = () => {
            this.currentPage++;
            this.gridEl.empty();
            this.renderVisibleWidgets();
            this.renderPagination();
            this.contentEl.scrollTop = 0;
        };
    }

    loadMore() {
        if (this.currentPage * this.itemsPerPage < this.filteredTemplates.length) {
            this.currentPage++;
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const nextBatch = this.filteredTemplates.slice(start, start + this.itemsPerPage);
            nextBatch.forEach(template => this.renderWidgetCard(template));
        }
    }

    async insertWidget(template: WidgetTemplate) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        const editor = this.targetEditor || activeView?.editor;

        if (!editor && !activeView) {
            new Notice(this.plugin.t('insertError'));
            return;
        }

        const uniqueId = `widget_${Date.now()}`;
        const content = `\n\n\`\`\`widget\nID: ${uniqueId}\n${template.html}\n---\n${template.css}\n---\n${template.js}\n\`\`\``;

        if (editor) {
            const cursor = editor.getCursor();
            editor.replaceRange(content, cursor);
            new Notice(this.plugin.t('widgetSaved'));
            this.close();
        } else if (activeView) {
            const activeFile = activeView.file;
            if (activeFile) {
                await this.app.vault.append(activeFile, content);
                new Notice(this.plugin.t('widgetSaved'));
                this.close();
            }
        }
    }

    openWidgetEditor(template?: WidgetTemplate) {
        new WidgetEditorModal(this.app, this.plugin, async (saved) => {
            this.allTemplates = await this.plugin.getGalleryWidgets();
            this.extractAllTags();
            this.populateTagDropdown();
            this.filterAndRender();
        }, template).open();
    }
}

class WidgetEditorModal extends Modal {
    plugin: WidgetPlugin;
    template: WidgetTemplate;
    originalId: string;
    onSave: (template: WidgetTemplate) => void;

    constructor(app: App, plugin: WidgetPlugin, onSave: (template: WidgetTemplate) => void, template?: WidgetTemplate) {
        super(app);
        this.plugin = plugin;
        this.onSave = onSave;
        this.template = template ? { ...template, tags: template.tags || [] } : {
            id: `widget_${Date.now()}`,
            name: 'Nouveau Widget',
            html: '<div>Hello Widget</div>',
            css: 'div { color: var(--text-accent); }',
            js: 'console.log("Widget loaded");',
            tags: []
        };
        this.originalId = template ? template.id : "";
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        (this as any).modalEl.addClass('widget-editor-modal');

        const isNew = !this.template.name || this.template.name === 'Nouveau Widget';
        contentEl.createEl('h2', { text: isNew ? `✨ ${this.plugin.t('createWidget')}` : this.plugin.t('editWidget', this.template.name) });

        new Setting(contentEl)
            .setName(this.plugin.t('widgetName'))
            .addText(text => text
                .setValue(this.template.name)
                .onChange(v => this.template.name = v));

        new Setting(contentEl)
            .setName(this.plugin.t('widgetId'))
            .addText(text => text
                .setValue(this.template.id)
                .onChange(v => {
                    this.template.id = v.replace(/[^a-zA-Z0-9_-]/g, '');
                }));

        new Setting(contentEl)
            .setName(this.plugin.t('widgetTags'))
            .addText(text => text
                .setValue((this.template.tags || []).join(', '))
                .onChange(v => {
                    this.template.tags = v.split(',').map(t => t.trim()).filter(t => t.length > 0);
                }));

        this.createEditorField(contentEl, this.plugin.t('htmlContent'), this.template.html, (v: string) => this.template.html = v);
        this.createEditorField(contentEl, this.plugin.t('cssContent'), this.template.css, (v: string) => this.template.css = v);
        this.createEditorField(contentEl, this.plugin.t('jsContent'), this.template.js, (v: string) => this.template.js = v);

        const footer = contentEl.createDiv({ cls: 'modal-footer' });
        const cancelBtn = footer.createEl('button', { text: this.plugin.t('cancel') });
        cancelBtn.onclick = () => this.close();

        const saveBtn = footer.createEl('button', { text: `💾 ${this.plugin.t('saveWidget')}`, cls: 'mod-cta' });
        saveBtn.onclick = async () => {
            if (!this.template.id) {
                new Notice("ID is required");
                return;
            }

            // If ID changed, delete old file
            if (this.originalId && this.originalId !== this.template.id) {
                await this.plugin.deleteFromGallery(this.originalId);
            }

            await this.plugin.saveToGallery(this.template);
            new Notice(this.plugin.t('widgetSaved'));
            this.onSave(this.template);
            this.close();
        };
    }

    createEditorField(container: HTMLElement, name: string, value: string, onChange: (v: string) => void) {
        const wrap = container.createDiv({ cls: 'editor-field-wrap' });
        wrap.createEl('label', { text: name });
        const area = wrap.createEl('textarea');
        area.value = value;
        area.oninput = (e) => onChange((e.target as HTMLTextAreaElement).value);
        return area;
    }
}

class WidgetSettingTab extends PluginSettingTab {
    plugin: WidgetPlugin;
    constructor(app: App, plugin: WidgetPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: this.plugin.t('settingsTitle') });

        new Setting(containerEl)
            .setName(this.plugin.t('settingsLanguage'))
            .setDesc(this.plugin.t('settingsLanguageDesc'))
            .addDropdown(dropdown => dropdown
                .addOption('en', 'English')
                .addOption('fr', 'Français')
                .addOption('es', 'Español')
                .addOption('de', 'Deutsch')
                .addOption('pt', 'Português')
                .setValue(this.plugin.settings.language)
                .onChange(async (value: Language) => {
                    this.plugin.settings.language = value;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to update labels
                }));

        new Setting(containerEl)
            .setName(this.plugin.t('settingsGalleryPath'))
            .setDesc(this.plugin.t('settingsGalleryPathDesc'))
            .addText(text => text
                .setValue(this.plugin.settings.galleryPath)
                .onChange(async (value) => {
                    this.plugin.settings.galleryPath = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('hr');
        containerEl.createEl('h3', { text: "Community & Updates" });

        new Setting(containerEl)
            .setName(this.plugin.t('settingsGithub'))
            .setDesc(this.plugin.t('settingsGithubDesc'))
            .addButton(btn => btn
                .setButtonText("GitHub")
                .setCta()
                .onClick(() => {
                    window.open(this.plugin.settings.githubUrl, '_blank');
                }));

        new Setting(containerEl)
            .setName(this.plugin.t('syncGalleryBtn'))
            .setDesc(this.plugin.t('syncGalleryDesc'))
            .addButton(btn => btn
                .setButtonText("Update")
                .onClick(async () => {
                    btn.setDisabled(true);
                    btn.setButtonText("...");
                    await this.plugin.syncGallery();
                    btn.setDisabled(false);
                    btn.setButtonText("Update");
                }));
    }
}
