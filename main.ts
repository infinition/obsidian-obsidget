import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, normalizePath, MarkdownPostProcessorContext, Modal, MarkdownView, Editor, Menu, requestUrl, DropdownComponent } from 'obsidian';
import { I18N_DICT, Language } from './i18n';

interface WidgetPluginSettings {
    galleryPath: string;
    language: Language;
    githubUrl: string;
    maxWidthValue: number;
    maxWidthUnit: 'percent' | 'pixel';
    firstRun: boolean;
}

const DEFAULT_SETTINGS: WidgetPluginSettings = {
    galleryPath: '.obsidian/plugins/obsidian-obsidget/gallery',
    language: 'en',
    githubUrl: 'https://github.com/infinition/obsidian-obsidget',
    maxWidthValue: 100,
    maxWidthUnit: 'percent',
    firstRun: true
};

interface WidgetTemplate {
    id: string;
    name: string;
    html: string;
    css: string;
    js: string;
    data?: any;
    tags?: string[];
}

export default class WidgetPlugin extends Plugin {
    app: App;
    settings: WidgetPluginSettings;
    templateCache: Map<string, WidgetTemplate> = new Map();

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

        // First run sync or empty gallery check (for BRAT installations)
        // First run sync
        this.app.workspace.onLayoutReady(async () => {
            console.log("ObsidGet: Checking first run status...", this.settings.firstRun);

            // Check if gallery folder is empty or doesn't exist
            const galleryExists = await this.app.vault.adapter.exists(this.settings.galleryPath);
            let isEmpty = true;

            if (galleryExists) {
                const files = await this.app.vault.adapter.list(this.settings.galleryPath);
                isEmpty = files.files.filter(f => f.endsWith('.json')).length === 0;
            }

            // Sync if first run OR if gallery is empty
            if (this.settings.firstRun || isEmpty) {
                console.log("ObsidGet: First run or empty gallery detected, starting sync...");
                new Notice("ObsidGet: Downloading widgets from gallery...");
                this.settings.firstRun = false;
                await this.saveSettings();
                await this.syncGallery();
            }
        });

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

        // Command to refresh all widgets
        this.addCommand({
            id: 'refresh-all-widgets',
            name: 'Refresh All Widgets',
            callback: () => {
                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (view) {
                    (view as any).previewMode?.rerender(true);
                    new Notice('Refreshing all widgets...');
                }
            }
        });

        // Context menu integration
        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
                menu.addItem((item) => {
                    item
                        .setTitle(this.t('insertWidgetMenu'))
                        .setIcon("zap")
                        .setSection("insert")
                        .onClick(async () => {
                            new WidgetGalleryModal(this.app, this, editor).open();
                        });
                });
            })
        );

        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                if (leaf?.view instanceof MarkdownView) {
                    // Force a re-render to help widgets load more proactively
                    (leaf.view as any).previewMode?.rerender(true);
                }
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
                if (this.templateCache.has(widgetId)) {
                    const template = this.templateCache.get(widgetId)!;
                    htmlContent = template.html;
                    if (!cssContent) cssContent = template.css;
                    if (!jsContent) jsContent = template.js;
                } else {
                    const galleryPath = normalizePath(`${this.settings.galleryPath}/${widgetId}.json`);
                    try {
                        if (await this.app.vault.adapter.exists(galleryPath)) {
                            const content = await this.app.vault.adapter.read(galleryPath);
                            const template: WidgetTemplate = JSON.parse(content);
                            this.templateCache.set(widgetId, template);
                            htmlContent = template.html;
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
            }

            // Show a placeholder while loading if it's a linked widget
            if (isLinked && !htmlContent) {
                el.innerHTML = '<div class="widget-loading">Loading widget...</div>';
            }

            const sectionInfo = ctx.getSectionInfo(el);
            const lineStart = sectionInfo?.lineStart || 0;
            const filePath = ctx.sourcePath;

            const instanceId = widgetId || `${filePath.replace(/\//g, '_')}__line${lineStart}`;

            // Create widget container
            const container = el.createDiv({ cls: 'widget-instance-container' });

            // Apply max width from settings
            const { maxWidthValue, maxWidthUnit } = this.settings;
            if (maxWidthUnit === 'percent' && maxWidthValue < 100) {
                container.style.maxWidth = `${maxWidthValue}%`;
                container.style.marginLeft = 'auto';
                container.style.marginRight = 'auto';
            } else if (maxWidthUnit === 'pixel') {
                container.style.maxWidth = `${maxWidthValue}px`;
                container.style.marginLeft = 'auto';
                container.style.marginRight = 'auto';
            }

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

            // Find focused element in shadow root before re-render
            let focusedId: string | null = null;
            let selectionStart: number | null = null;
            let selectionEnd: number | null = null;

            const activeEl = document.activeElement;
            if (activeEl && el.contains(activeEl)) {
                // Check if it's within our container's shadow root
                const shadowActive = container.shadowRoot?.activeElement as HTMLInputElement | HTMLTextAreaElement;
                if (shadowActive && shadowActive.id) {
                    focusedId = shadowActive.id;
                    selectionStart = shadowActive.selectionStart;
                    selectionEnd = shadowActive.selectionEnd;
                }
            }

            const shadow = container.attachShadow({ mode: 'open' });

            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                :host { display: block; position: relative; width: 100%; padding: 4px; box-sizing: border-box; }
                ${cssContent}
            `;
            shadow.appendChild(style);

            const innerDiv = document.createElement('div');
            innerDiv.style.width = '100%';
            innerDiv.innerHTML = htmlContent;
            shadow.appendChild(innerDiv);

            // Per-instance debounce timer
            let saveTimeout: any = null;

            // API for widget
            const api = {
                root: shadow,
                saveState: async (data: any) => {
                    const section = ctx.getSectionInfo(el);
                    if (section) {
                        const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
                        if (file instanceof TFile) {
                            const newDataStr = JSON.stringify(data, null, 2);

                            if (saveTimeout) clearTimeout(saveTimeout);
                            saveTimeout = setTimeout(async () => {
                                try {
                                    await this.app.vault.process(file, (oldContent) => {
                                        const lines = oldContent.split('\n');
                                        if (section.lineStart + 1 >= lines.length || section.lineEnd > lines.length) return oldContent;

                                        const blockLines = lines.slice(section.lineStart + 1, section.lineEnd);
                                        const blockContent = blockLines.join('\n');

                                        // Robust splitting: only the first 3 '---' are separators
                                        const blockSections: string[] = [];
                                        let remaining = blockContent;
                                        for (let i = 0; i < 3; i++) {
                                            const index = remaining.indexOf('---');
                                            if (index !== -1) {
                                                blockSections.push(remaining.substring(0, index));
                                                remaining = remaining.substring(index + 3);
                                            } else {
                                                break;
                                            }
                                        }
                                        blockSections.push(remaining);

                                        const currentDataStr = blockSections[3]?.trim() || "";
                                        if (newDataStr === currentDataStr) return oldContent;

                                        const newSections = [...blockSections];
                                        while (newSections.length < 4) {
                                            newSections.push('');
                                        }

                                        // Update data section
                                        newSections[3] = newDataStr;

                                        // Reconstruct block with precise newline handling
                                        const trimmedData = newSections[3].trim();
                                        const newBlockContent = [
                                            newSections[0].trim(),
                                            newSections[1].trim(),
                                            newSections[2].trim(),
                                            trimmedData
                                        ].join('\n---\n') + (trimmedData ? '\n' : '');

                                        lines.splice(section.lineStart + 1, section.lineEnd - section.lineStart - 1, newBlockContent);
                                        return lines.join('\n');
                                    });
                                } catch (e) {
                                    console.error('Inline save failed:', e);
                                }
                            }, 500);
                        }
                    }
                },
                getState: async () => {
                    if (inlineDataStr && inlineDataStr !== '{}') {
                        try {
                            return JSON.parse(inlineDataStr);
                        } catch (e) { }
                    }
                    return null;
                },
                instanceId: instanceId,
                requestUrl: requestUrl
            };

            // Execute JS
            try {
                // Create a context object that will hold both api methods and widget-defined functions
                const widgetContext: any = {};

                const apiProxy = new Proxy(api as any, {
                    get(target, prop) {
                        // First check widget context (for functions defined in widget JS)
                        if (prop in widgetContext) return widgetContext[prop];
                        // Then check api
                        if (prop in target) return target[prop];
                        // Then check window
                        return (window as any)[prop];
                    },
                    set(target, prop, value) {
                        // Store in widget context so it's accessible to event handlers
                        widgetContext[prop] = value;
                        target[prop] = value;
                        return true;
                    }
                });

                // Dynamically extract all function names from the JS content
                const functionNames: string[] = [];
                // Match both regular and async function declarations
                const functionRegex = /(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
                let match;
                while ((match = functionRegex.exec(jsContent)) !== null) {
                    if (match[1] !== 'init') { // init is already called
                        functionNames.push(match[1]);
                    }
                }
                // Also add 'init' if present
                if (/function\s+init\s*\(/.test(jsContent)) {
                    functionNames.push('init');
                }

                // Build dynamic function export code
                const functionExports = functionNames.map(name =>
                    `if (typeof ${name} === 'function') api.${name} = ${name};`
                ).join('\n');

                // Wrap the script to capture function declarations
                const wrappedScript = `
                    ${jsContent}
                    // After script runs, copy declared functions to api for event handler access
                    try {
                        ${functionExports}
                    } catch(e) { console.error('Function export error:', e); }
                `;

                const scriptFunction = new Function('api', `with(api) { ${wrappedScript} }`);
                scriptFunction(apiProxy);
                this.bindEvents(shadow, apiProxy);

                // Restore focus after re-render
                if (focusedId) {
                    setTimeout(() => {
                        const elToFocus = shadow.getElementById(focusedId!) as HTMLInputElement | HTMLTextAreaElement;
                        if (elToFocus) {
                            elToFocus.focus();
                            if (selectionStart !== null && selectionEnd !== null) {
                                elToFocus.setSelectionRange(selectionStart, selectionEnd);
                            }
                        }
                    }, 0);
                }
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

        // Migration from old name
        if (this.settings.galleryPath === '.obsidian/plugins/obsidian-widget-css/gallery') {
            this.settings.galleryPath = '.obsidian/plugins/obsidian-obsidget/gallery';
            await this.saveSettings();
        }
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
            console.log("ObsidGet: Syncing gallery from:", apiUrl);
            const response = await requestUrl({ url: apiUrl });

            console.log("ObsidGet: GitHub Response Status:", response.status);

            if (response.status !== 200) {
                throw new Error(`GitHub API returned ${response.status}. Make sure the repository and 'gallery' folder exist.`);
            }

            const files = response.json;
            if (!Array.isArray(files)) {
                throw new Error("GitHub API did not return a list of files.");
            }

            console.log(`ObsidGet: ${files.length} items found on GitHub gallery.`);
            let addedCount = 0;

            // Ensure gallery directory exists before writing
            await this.ensureDirectory(this.settings.galleryPath);

            for (const file of files) {
                if (file.name.endsWith('.json')) {
                    const localPath = normalizePath(`${this.settings.galleryPath}/${file.name}`);
                    const existsLocally = await this.app.vault.adapter.exists(localPath);

                    if (!existsLocally) {
                        console.log("ObsidGet: Downloading new widget:", file.name);
                        const fileResponse = await requestUrl({ url: file.download_url });
                        if (fileResponse.status === 200) {
                            await this.app.vault.adapter.write(localPath, fileResponse.text);
                            addedCount++;
                        } else {
                            console.error(`ObsidGet: Failed to download ${file.name}:`, fileResponse.status);
                        }
                    }
                }
            }

            console.log(`ObsidGet: Sync complete. ${addedCount} widgets added.`);
            new Notice(this.t('syncSuccess', addedCount));
        } catch (e) {
            console.error('ObsidGet: Gallery sync failed:', e);
            new Notice(this.t('syncError', e.message));
        }
    }

    async updateAllWidgetsInVault() {
        try {
            const files = this.app.vault.getMarkdownFiles();
            let updatedWidgetsCount = 0;
            let updatedFilesCount = 0;

            const galleryWidgets = await this.getGalleryWidgets();
            const galleryMap = new Map(galleryWidgets.map(w => [w.id, w]));

            if (galleryMap.size === 0) {
                new Notice(this.t('updateAllWidgetsNoWidgets'));
                return;
            }

            // Regex to find widget code blocks
            const widgetRegex = /```widget\n([\s\S]*?)```/g;

            for (const file of files) {
                await this.app.vault.process(file, (content) => {
                    let fileUpdated = false;
                    const newContent = content.replace(widgetRegex, (match, source) => {
                        // Robust splitting: only the first 3 '---' are separators
                        const sections: string[] = [];
                        let remaining = source;
                        for (let i = 0; i < 3; i++) {
                            const index = remaining.indexOf('---');
                            if (index !== -1) {
                                sections.push(remaining.substring(0, index));
                                remaining = remaining.substring(index + 3);
                            } else {
                                break;
                            }
                        }
                        sections.push(remaining);

                        let firstSection = sections[0].trim();
                        let widgetId = '';

                        if (firstSection.startsWith('ID:')) {
                            const lines = firstSection.split('\n');
                            widgetId = lines[0].replace('ID:', '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
                        }

                        if (widgetId && galleryMap.has(widgetId)) {
                            const template = galleryMap.get(widgetId)!;
                            const dataSection = sections[3] || '';
                            const trimmedData = dataSection.trim();

                            // Reconstruct the widget block robustly (4 sections total)
                            const newBlock = [
                                `ID: ${widgetId}\n${template.html.trim()}`,
                                template.css.trim(),
                                template.js.trim(),
                                trimmedData
                            ].join('\n---\n') + (trimmedData ? '\n' : '');

                            if (`\`\`\`widget\n${newBlock}\`\`\`` !== match) {
                                updatedWidgetsCount++;
                                fileUpdated = true;
                                return `\`\`\`widget\n${newBlock}\`\`\``;
                            }
                        }
                        return match;
                    });

                    if (fileUpdated) {
                        updatedFilesCount++;
                        return newContent;
                    }
                    return content;
                });
            }

            if (updatedWidgetsCount > 0) {
                new Notice(this.t('updateAllWidgetsSuccess', updatedWidgetsCount, updatedFilesCount));
            } else {
                new Notice(this.t('updateAllWidgetsNoWidgets'));
            }
        } catch (e) {
            console.error('ObsidGet: Update all widgets failed:', e);
            new Notice(this.t('updateAllWidgetsError', e.message));
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

        // Sync Button
        const syncBtn = controlsContainer.createEl('button', { text: `🔄`, cls: 'gallery-sync-btn', attr: { title: this.plugin.t('syncGalleryBtn') } });
        syncBtn.onclick = async () => {
            syncBtn.addClass('is-loading');
            await this.plugin.syncGallery();
            syncBtn.removeClass('is-loading');
            await this.refresh();
        };

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
        style.textContent = `:host { display: block; padding: 4px; width: 100%; max-width: 100%; overflow: hidden; pointer-events: none; user-select: none; box-sizing: border-box; } * { pointer-events: none !important; max-width: 100%; box-sizing: border-box; } img, video, iframe { max-width: 100%; height: auto; } ${template.css}`;
        shadow.appendChild(style);

        const innerWrap = document.createElement('div');
        innerWrap.style.width = '100%';
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

        const dataStr = template.data ? JSON.stringify(template.data, null, 2) : '';
        const content = `\n\n\`\`\`widget\nID: ${template.id}\n${template.html}\n---\n${template.css}\n---\n${template.js}\n---\n${dataStr}\n\`\`\``;

        if (editor) {
            const cursor = editor.getCursor();
            editor.replaceRange(content, cursor);
            new Notice(this.plugin.t('widgetSaved'));
            // this.close(); // Keep open as requested
        } else if (activeView) {
            const activeFile = activeView.file;
            if (activeFile) {
                await this.app.vault.append(activeFile, content);
                new Notice(this.plugin.t('widgetSaved'));
                // this.close(); // Keep open as requested
            }
        }
    }

    async refresh() {
        this.allTemplates = await this.plugin.getGalleryWidgets();
        this.extractAllTags();
        this.populateTagDropdown();
        this.filterAndRender();
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

        new Setting(containerEl)
            .setName(this.plugin.t('settingsMaxWidth'))
            .setDesc(this.plugin.t('settingsMaxWidthDesc'))
            .addDropdown((dropdown: DropdownComponent) => dropdown
                .addOption('percent', '%')
                .addOption('pixel', 'px')
                .setValue(this.plugin.settings.maxWidthUnit)
                .onChange(async (value: 'percent' | 'pixel') => {
                    this.plugin.settings.maxWidthUnit = value;
                    if (value === 'percent') {
                        this.plugin.settings.maxWidthValue = Math.min(this.plugin.settings.maxWidthValue, 100);
                    } else {
                        if (this.plugin.settings.maxWidthValue <= 100) {
                            this.plugin.settings.maxWidthValue = 600; // Default pixel width
                        }
                    }
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to update slider limits
                }))
            .addSlider(slider => slider
                .setLimits(this.plugin.settings.maxWidthUnit === 'percent' ? 10 : 200, this.plugin.settings.maxWidthUnit === 'percent' ? 100 : 2000, 5)
                .setValue(this.plugin.settings.maxWidthValue)
                .setDynamicTooltip()
                .onChange(async (value: number) => {
                    this.plugin.settings.maxWidthValue = value;
                    await this.plugin.saveSettings();
                    // Force re-render of active view
                    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                    if (view) {
                        (view as any).previewMode?.rerender(true);
                    }
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

        containerEl.createEl('hr');
        containerEl.createEl('h3', { text: "Maintenance" });

        new Setting(containerEl)
            .setName(this.plugin.t('updateAllWidgets'))
            .setDesc(this.plugin.t('updateAllWidgetsDesc'))
            .addButton(btn => btn
                .setButtonText(this.plugin.t('updateAllWidgetsBtn'))
                .setWarning()
                .onClick(async () => {
                    btn.setDisabled(true);
                    const originalText = btn.buttonEl.innerText;
                    btn.setButtonText("...");
                    await this.plugin.updateAllWidgetsInVault();
                    btn.setDisabled(false);
                    btn.setButtonText(originalText);
                }));
    }
}
