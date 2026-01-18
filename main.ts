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
    description?: string;
    author?: string;
    authorUrl?: string;
}

export default class WidgetPlugin extends Plugin {
    settings!: WidgetPluginSettings;
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

        // First run sync
        this.app.workspace.onLayoutReady(async () => {
            console.log("ObsidGet: Checking first run status...", this.settings.firstRun);
            if (this.settings.firstRun) {
                console.log("ObsidGet: First run detected, starting sync...");
                new Notice("ObsidGet: First installation detected. Downloading widgets...");
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

        // Command to update plugin from GitHub
        this.addCommand({
            id: 'update-plugin',
            name: this.t('updatePluginCommand'),
            callback: () => {
                this.updatePlugin();
            }
        });

        // Context menu integration
        this.registerEvent(
            this.app.workspace.on("editor-menu" as any, (menu: any, editor: any, view: any) => {
                menu.addItem((item: any) => {
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
            if (!htmlContent.trim() && widgetId) {
                isLinked = true;
                let template = this.templateCache.get(widgetId);

                if (!template) {
                    const galleryPath = normalizePath(`${this.settings.galleryPath}/${widgetId}.json`);
                    try {
                        if (await this.app.vault.adapter.exists(galleryPath)) {
                            const content = await this.app.vault.adapter.read(galleryPath);
                            template = JSON.parse(content);
                            this.templateCache.set(widgetId, template!);
                        }
                    } catch (e) {
                        console.error(`Error loading widget "${widgetId}":`, e);
                    }
                }

                if (template) {
                    if (!htmlContent.trim()) htmlContent = template.html || '';
                    if (!cssContent.trim()) cssContent = template.css || '';
                    if (!jsContent.trim()) jsContent = template.js || '';
                } else {
                    htmlContent = `<div class="mod-warning">Widget "${widgetId}" not found in gallery.</div>`;
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
                createBtn('✏️', 'Edit this widget in gallery', async () => {
                    let template = this.templateCache.get(widgetId);
                    if (!template || !template.css || !template.js) {
                        const galleryPath = normalizePath(`${this.settings.galleryPath}/${widgetId}.json`);
                        if (await this.app.vault.adapter.exists(galleryPath)) {
                            const content = await this.app.vault.adapter.read(galleryPath);
                            template = JSON.parse(content);
                            if (template) this.templateCache.set(widgetId, template);
                        }
                    }

                    if (template) {
                        new WidgetEditorModal(this.app, this, async (saved) => {
                            await this.saveToGallery(saved);
                            this.templateCache.set(saved.id, saved);
                            new Notice(`Widget "${saved.name}" updated!`);
                            this.app.workspace.trigger('layout-change');
                        }, template).open();
                    } else {
                        new Notice(`Could not load widget "${widgetId}" from gallery.`);
                    }
                });

                // Reverse to Local Button
                createBtn('🔓', 'Convert to Local Widget (Full Code)', async () => {
                    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                    if (view) {
                        const editor = view.editor;
                        const section = ctx.getSectionInfo(el);
                        if (section) {
                            const rangeStart = { line: section.lineStart, ch: 0 };
                            const rangeEnd = { line: section.lineEnd + 1, ch: 0 };

                            const dataSection = (inlineDataStr && inlineDataStr.trim() !== "" && inlineDataStr.trim() !== "{}")
                                ? `\n---\n${inlineDataStr.trim()}`
                                : "";

                            const newContent = `\n\`\`\`widget\nID: ${widgetId}\n${htmlContent}\n---\n${cssContent}\n---\n${jsContent}${dataSection}\n\`\`\`\n\n`;
                            editor.replaceRange(newContent, rangeStart, rangeEnd);
                            new Notice('Converted to Local Widget!');
                        }
                    }
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

                // Edit Button for Local Widgets
                createBtn('✏️', 'Edit this widget', () => {
                    const template: WidgetTemplate = {
                        id: widgetId || `widget_${Date.now()}`,
                        name: widgetId || 'Local Widget',
                        html: htmlContent,
                        css: cssContent,
                        js: jsContent,
                        data: inlineDataStr ? JSON.parse(inlineDataStr) : undefined
                    };
                    const modal = new WidgetEditorModal(this.app, this, async (saved) => {
                        // Save to gallery
                        await this.saveToGallery(saved);
                        new Notice(`Widget "${saved.name}" saved to gallery!`);

                        // Update local block
                        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                        if (view) {
                            const editor = view.editor;
                            const section = ctx.getSectionInfo(el);
                            if (section) {
                                const rangeStart = { line: section.lineStart, ch: 0 };
                                const rangeEnd = { line: section.lineEnd + 1, ch: 0 };
                                const dataSection = (saved.data && JSON.stringify(saved.data) !== "{}")
                                    ? `\n---\n${JSON.stringify(saved.data, null, 2)}`
                                    : "";
                                const newContent = `\n\`\`\`widget\nID: ${saved.id}\n${saved.html}\n---\n${saved.css}\n---\n${saved.js}${dataSection}\n\`\`\`\n\n`;
                                editor.replaceRange(newContent, rangeStart, rangeEnd);
                            }
                        }
                    }, template);
                    modal.open();
                });

                // Convert to Link Button
                createBtn('🔗', 'Convert to Linked Widget (Short Code)', async () => {
                    if (!widgetId) {
                        new Notice('Please save the widget with an ID first (or add ID: name to the block).');
                        return;
                    }

                    const galleryPath = normalizePath(`${this.settings.galleryPath}/${widgetId}.json`);
                    if (!(await this.app.vault.adapter.exists(galleryPath))) {
                        new Notice(`Widget "${widgetId}" not found in gallery. Please save it first.`);
                        return;
                    }

                    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                    if (view) {
                        const editor = view.editor;
                        const section = ctx.getSectionInfo(el);
                        if (section) {
                            const rangeStart = { line: section.lineStart, ch: 0 };
                            const rangeEnd = { line: section.lineEnd + 1, ch: 0 };
                            const dataSection = (inlineDataStr && inlineDataStr.trim() !== "" && inlineDataStr.trim() !== "{}")
                                ? `\n---\n---\n---\n${inlineDataStr.trim()}`
                                : "";
                            const newContent = `\n\`\`\`widget\nID: ${widgetId}${dataSection}\n\`\`\`\n\n`;
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
            innerDiv.innerHTML = htmlContent + "<slot></slot>";
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
                                        const reconstructedSections = [
                                            blockSections[0].trim(),
                                            blockSections[1]?.trim() || '',
                                            blockSections[2]?.trim() || '',
                                            newDataStr.trim()
                                        ];

                                        const newBlockContent = reconstructedSections.join('\n---\n') + '\n';

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
                requestUrl: requestUrl,
                getFrontmatter: async (path?: string) => {
                    const targetPath = path || ctx.sourcePath;
                    const file = this.app.vault.getAbstractFileByPath(targetPath);
                    if (file instanceof TFile) {
                        const cache = this.app.metadataCache.getFileCache(file);
                        return cache?.frontmatter || {};
                    }
                    return {};
                },
                updateFrontmatter: async (data: any, path?: string) => {
                    const targetPath = path || ctx.sourcePath;
                    const file = this.app.vault.getAbstractFileByPath(targetPath);
                    if (file instanceof TFile) {
                        await this.app.fileManager.processFrontMatter(file, (frontmatter: any) => {
                            Object.assign(frontmatter, data);
                        });
                    }
                },
                getWidgetState: async (widgetId: string, path?: string) => {
                    const targetPath = path || ctx.sourcePath;
                    const file = this.app.vault.getAbstractFileByPath(targetPath);
                    if (!(file instanceof TFile)) return null;

                    const content = await this.app.vault.read(file);
                    // Regex to find the widget block with specific ID
                    const regex = new RegExp("```widget\\s*\\nID:\\s*" + widgetId + "\\s*\\n([\\s\\S]*?)\\n```", "i");
                    const match = content.match(regex);
                    if (!match) return null;

                    const blockContent = match[1];
                    const sections: string[] = [];
                    let remaining = blockContent;
                    for (let i = 0; i < 3; i++) {
                        const index = remaining.indexOf('---');
                        if (index !== -1) {
                            sections.push(remaining.substring(0, index));
                            remaining = remaining.substring(index + 3);
                        } else { break; }
                    }
                    sections.push(remaining);

                    if (sections.length < 4) return null;
                    try {
                        return JSON.parse(sections[3].trim());
                    } catch (e) { return null; }
                },
                updateWidgetState: async (widgetId: string, data: any, path?: string) => {
                    const targetPath = path || ctx.sourcePath;
                    const file = this.app.vault.getAbstractFileByPath(targetPath);
                    if (!(file instanceof TFile)) return;

                    await this.app.vault.process(file, (oldContent) => {
                        const regex = new RegExp("(```widget\\s*\\nID:\\s*" + widgetId + "\\s*\\n)([\\s\\S]*?)(?=\\n```)", "i");
                        const match = oldContent.match(regex);
                        if (!match) return oldContent;

                        const prefix = match[1];
                        const blockContent = match[2];

                        const sections: string[] = [];
                        let remaining = blockContent;
                        for (let i = 0; i < 3; i++) {
                            const index = remaining.indexOf('---');
                            if (index !== -1) {
                                sections.push(remaining.substring(0, index));
                                remaining = remaining.substring(index + 3);
                            } else { break; }
                        }
                        sections.push(remaining);

                        while (sections.length < 4) sections.push("");
                        sections[3] = "\n" + JSON.stringify(data, null, 2) + "\n";

                        // Reconstruct block
                        const newBlockContent = [
                            sections[0].trim(),
                            sections[1].trim(),
                            sections[2].trim(),
                            sections[3].trim()
                        ].join('\n---\n') + '\n';

                        return oldContent.replace(match[0], prefix + newBlockContent);
                    });
                },
                getFiles: (extension?: string) => {
                    let files = this.app.vault.getFiles();
                    if (extension) {
                        files = files.filter(f => f.extension === extension.replace('.', ''));
                    }
                    return files.map(f => f.path);
                },
                readFile: async (path: string) => {
                    const normalizedPath = normalizePath(path);
                    try {
                        const exists = await this.app.vault.adapter.exists(normalizedPath);
                        if (!exists) return null;
                        return await this.app.vault.adapter.read(normalizedPath);
                    } catch (e) {
                        return null;
                    }
                },
                writeFile: async (path: string, content: string) => {
                    const normalizedPath = normalizePath(path);
                    try {
                        // Ensure directory exists
                        const dirPath = normalizedPath.split('/').slice(0, -1).join('/');
                        if (dirPath && !(await this.app.vault.adapter.exists(dirPath))) {
                            await this.app.vault.createFolder(dirPath);
                        }
                        await this.app.vault.adapter.write(normalizedPath, content);
                    } catch (e) {
                        console.error('ObsidGet: Error writing file:', e);
                    }
                },
                parseCSV: (text: string, delimiter: string = ',') => {
                    if (!text) return [];
                    const lines = text.split('\n').filter(l => l.trim());
                    if (lines.length === 0) return [];
                    const headers = lines[0].split(delimiter).map(h => h.trim());
                    return lines.slice(1).map(line => {
                        const values = line.split(delimiter);
                        const obj: any = {};
                        headers.forEach((header, i) => {
                            obj[header] = values[i]?.trim();
                        });
                        return obj;
                    });
                },
                stringifyCSV: (data: any[], delimiter: string = ',') => {
                    if (!data || data.length === 0) return "";
                    const headers = Object.keys(data[0]);
                    const csvLines = [headers.join(delimiter)];
                    data.forEach(row => {
                        csvLines.push(headers.map(h => row[h]).join(delimiter));
                    });
                    return csvLines.join('\n');
                }
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
        } catch (e: any) {
            console.error('ObsidGet: Sync failed:', e);
            new Notice(`Sync failed: ${e.message}`);
        }
    }

    async updatePlugin() {
        try {
            const releaseUrl = "https://api.github.com/repos/infinition/obsidian-obsidget/releases/latest";
            new Notice("Checking for plugin updates...");
            const response = await requestUrl({ url: releaseUrl });

            if (response.status !== 200) {
                throw new Error(`GitHub API returned ${response.status}`);
            }

            const release = response.json;
            const assets = release.assets;

            if (!assets || !Array.isArray(assets)) {
                throw new Error("No assets found in the latest release.");
            }

            const filesToDownload = ['main.js', 'manifest.json', 'styles.css'];
            const pluginDir = `.obsidian/plugins/obsidian-obsidget`;

            for (const fileName of filesToDownload) {
                const asset = assets.find((a: any) => a.name === fileName);
                if (asset) {
                    new Notice(`Downloading ${fileName}...`);
                    const fileResponse = await requestUrl({ url: asset.browser_download_url });
                    if (fileResponse.status === 200) {
                        await this.app.vault.adapter.write(`${pluginDir}/${fileName}`, fileResponse.text);
                    }
                }
            }

            new Notice("Plugin updated! Reloading...");

            // Reload the plugin
            // @ts-ignore
            const plugins = this.app.plugins;
            await plugins.disablePlugin(this.manifest.id);
            await plugins.enablePlugin(this.manifest.id);

        } catch (e: unknown) {
            console.error('ObsidGet: Plugin update failed:', e);
            new Notice(`Update failed: ${(e as Error).message}`);
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
        } catch (e: any) {
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
    gridEl!: HTMLElement;
    tagSelectEl!: HTMLSelectElement;
    searchInputEl!: HTMLInputElement;
    clearBtnEl!: HTMLElement;
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

        // Auto-sync if empty
        if (this.allTemplates.length === 0) {
            await this.plugin.syncGallery();
            this.allTemplates = await this.plugin.getGalleryWidgets();
        }

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
        let searchText = this.searchQuery.trim();
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
            // Search filter (name, id, description, OR tags if not a #tag search)
            const matchesSearch = searchText.length === 0 ||
                t.name.toLowerCase().includes(searchText) ||
                t.id.toLowerCase().includes(searchText) ||
                (t.description && t.description.toLowerCase().includes(searchText)) ||
                (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchText)));

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

        // Author info
        if (template.author) {
            const authorRow = cardHeader.createDiv({ cls: 'widget-card-author' });
            if (template.authorUrl) {
                const authorLink = authorRow.createEl('a', {
                    text: `👤 ${template.author}`,
                    href: template.authorUrl,
                    cls: 'widget-author-link'
                });
                authorLink.setAttribute('target', '_blank');
            } else {
                authorRow.createSpan({ text: `👤 ${template.author}` });
            }
        }

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

        // Description (truncated to 4 lines)
        if (template.description) {
            const descContainer = card.createDiv({ cls: 'widget-card-description' });
            const descText = descContainer.createEl('p', { text: template.description });

            // Click handler for popup
            descContainer.onclick = () => {
                const popup = new Modal(this.app);
                popup.titleEl.setText(template.name);
                popup.contentEl.createEl('p', { text: template.description });
                popup.open();
            };
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
        const content = `\n\n\`\`\`widget\nID: ${template.id}\n${template.html}\n---\n${template.css}\n---\n${template.js}\n---\n${dataStr}\n\`\`\`\n\n`;

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
    previewEl: HTMLElement;
    editorContainer: HTMLElement;
    activeTab: 'info' | 'code' | 'visual' = 'code';
    initialCss: string;
    initialVariables: Map<string, string> = new Map();

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
        this.initialCss = this.template.css;

        // Capture initial variables for per-element reset
        const varRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
        let match;
        while ((match = varRegex.exec(this.initialCss)) !== null) {
            this.initialVariables.set(match[1], match[2].trim());
        }

        this.previewEl = document.createElement('div');
        this.editorContainer = document.createElement('div');
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        (this as any).modalEl.addClass('widget-editor-modal-v2');

        const mainContainer = contentEl.createDiv({ cls: 'editor-main-container' });

        // Left Side: Editor
        this.editorContainer = mainContainer.createDiv({ cls: 'editor-side' });

        // Right Side: Preview
        const previewSide = mainContainer.createDiv({ cls: 'preview-side' });
        previewSide.createEl('h3', { text: `👁️ ${this.plugin.t('livePreview')}` });
        this.previewEl = previewSide.createDiv({ cls: 'preview-container' });

        this.renderEditor();
        this.updatePreview();
    }

    renderEditor() {
        this.editorContainer.empty();

        const isNew = !this.template.name || this.template.name === 'Nouveau Widget';
        this.editorContainer.createEl('h2', { text: isNew ? `✨ ${this.plugin.t('createWidget')}` : this.plugin.t('editWidget', this.template.name) });

        // Tabs
        const tabsContainer = this.editorContainer.createDiv({ cls: 'editor-tabs' });
        const tabs = [
            { id: 'info', label: 'ℹ️ Info' },
            { id: 'code', label: `💻 ${this.plugin.t('tabCode')}` },
            { id: 'visual', label: `🎨 ${this.plugin.t('tabVisual')}` }
        ];

        tabs.forEach(tab => {
            const tabBtn = tabsContainer.createEl('button', {
                text: tab.label,
                cls: `tab-btn ${this.activeTab === tab.id ? 'is-active' : ''}`
            });
            tabBtn.onclick = () => {
                this.activeTab = tab.id as any;
                this.renderEditor();
            };
        });

        const scrollArea = this.editorContainer.createDiv({ cls: 'editor-scroll-area' });

        if (this.activeTab === 'info') {
            new Setting(scrollArea)
                .setName(this.plugin.t('widgetName'))
                .addText(text => text
                    .setValue(this.template.name)
                    .onChange(v => {
                        this.template.name = v;
                        this.updatePreview(false);
                    }));

            new Setting(scrollArea)
                .setName(this.plugin.t('widgetId'))
                .addText(text => text
                    .setValue(this.template.id)
                    .onChange(v => {
                        this.template.id = v.replace(/[^a-zA-Z0-9_-]/g, '');
                    }));

            new Setting(scrollArea)
                .setName(this.plugin.t('widgetTags'))
                .addText(text => text
                    .setValue((this.template.tags || []).join(', '))
                    .onChange(v => {
                        this.template.tags = v.split(',').map(t => t.trim()).filter(t => t.length > 0);
                    }));

            new Setting(scrollArea)
                .setName(this.plugin.t('widgetDescription'))
                .setDesc(this.plugin.t('widgetDescriptionDesc'))
                .addTextArea(text => text
                    .setValue(this.template.description || '')
                    .onChange(v => this.template.description = v));

            new Setting(scrollArea)
                .setName(this.plugin.t('widgetAuthor'))
                .setDesc(this.plugin.t('widgetAuthorDesc'))
                .addText(text => text
                    .setValue(this.template.author || '')
                    .onChange(v => this.template.author = v));

            new Setting(scrollArea)
                .setName(this.plugin.t('widgetAuthorUrl'))
                .setDesc(this.plugin.t('widgetAuthorUrlDesc'))
                .addText(text => text
                    .setValue(this.template.authorUrl || '')
                    .onChange(v => this.template.authorUrl = v));
        } else if (this.activeTab === 'code') {
            this.createEditorField(scrollArea, this.plugin.t('htmlContent'), this.template.html, (v: string) => {
                this.template.html = v;
                this.updatePreview(false);
            });
            this.createEditorField(scrollArea, this.plugin.t('cssContent'), this.template.css, (v: string) => {
                this.template.css = v;
                this.updatePreview(true);
            });
            this.createEditorField(scrollArea, this.plugin.t('jsContent'), this.template.js, (v: string) => {
                this.template.js = v;
                this.updatePreview(false);
            });
        } else if (this.activeTab === 'visual') {
            this.renderVisualEditor(scrollArea);
        }

        const footer = this.editorContainer.createDiv({ cls: 'modal-footer' });
        const cancelBtn = footer.createEl('button', { text: this.plugin.t('cancel') });
        cancelBtn.onclick = () => this.close();

        const saveBtn = footer.createEl('button', { text: `💾 ${this.plugin.t('saveWidget')}`, cls: 'mod-cta' });
        saveBtn.onclick = async () => {
            if (!this.template.id) {
                new Notice("ID is required");
                return;
            }

            // Check for overwrite if ID changed or if it's a new widget
            if (this.template.id !== this.originalId) {
                const exists = await this.plugin.app.vault.adapter.exists(normalizePath(`${this.plugin.settings.galleryPath}/${this.template.id}.json`));
                if (exists) {
                    const confirm = window.confirm(`A widget with ID "${this.template.id}" already exists in the gallery. Overwrite?`);
                    if (!confirm) return;
                }
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

    renderVisualEditor(container: HTMLElement) {
        const header = container.createDiv({ cls: 'visual-editor-header' });
        header.createEl('h3', { text: this.plugin.t('detectedVariables') });

        const actions = header.createDiv({ cls: 'visual-header-actions' });

        const resetAllBtn = actions.createEl('button', { text: '🔄 Reset All', cls: 'clickable-icon' });
        resetAllBtn.title = "Reset all visual styles to initial state";
        resetAllBtn.onclick = () => {
            if (window.confirm("Reset all visual styles to initial state?")) {
                this.template.css = this.initialCss;
                this.renderEditor();
                this.updatePreview();
            }
        };

        const magicBtn = actions.createEl('button', { text: '✨ Magic Scan', cls: 'clickable-icon' });
        magicBtn.title = "Scan for hardcoded values and convert to variables";
        magicBtn.onclick = () => {
            this.magicScanAndInject();
            this.renderEditor();
        };

        const addVarBtn = actions.createEl('button', { text: '➕', cls: 'clickable-icon' });
        addVarBtn.title = "Add new variable";
        addVarBtn.onclick = () => this.promptAddVariable(container);

        const scrollArea = container.createDiv({ cls: 'visual-variables-list' });
        this.renderVariablesList(scrollArea);
    }

    renderVariablesList(container: HTMLElement) {
        container.empty();

        const css = this.template.css;
        const variablesMap = new Map<string, { value: string, isDefined: boolean }>();

        // 1. Find all definitions: --var: val;
        const defRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
        let match;
        while ((match = defRegex.exec(css)) !== null) {
            variablesMap.set(match[1], { value: match[2].trim(), isDefined: true });
        }

        // 2. Find all usages: var(--var)
        const usageRegex = /var\((--[a-zA-Z0-9_-]+)\)/g;
        usageRegex.lastIndex = 0;
        while ((match = usageRegex.exec(css)) !== null) {
            if (!variablesMap.has(match[1])) {
                variablesMap.set(match[1], { value: '', isDefined: false });
            }
        }

        // 3. Find any other --vars
        const genericVarRegex = /(--[a-zA-Z0-9_-]+)/g;
        genericVarRegex.lastIndex = 0;
        while ((match = genericVarRegex.exec(css)) !== null) {
            if (!variablesMap.has(match[1])) {
                variablesMap.set(match[1], { value: '', isDefined: false });
            }
        }

        if (variablesMap.size === 0) {
            const emptyState = container.createDiv({ cls: 'visual-empty-state' });
            emptyState.createEl('p', {
                text: 'No CSS variables detected. Use the Magic Scan button above to automatically convert your CSS to visual controls.',
                cls: 'mod-muted'
            });
            return;
        }

        // Sort variables: defined first, then by name
        const sortedVars = Array.from(variablesMap.entries()).sort((a, b) => {
            if (a[1].isDefined && !b[1].isDefined) return -1;
            if (!a[1].isDefined && b[1].isDefined) return 1;
            return a[0].localeCompare(b[0]);
        });

        sortedVars.forEach(([name, info]) => {
            const s = new Setting(container)
                .setName(name.replace('--', '').replace(/-/g, ' '));

            // Add hover events for highlighting
            s.settingEl.onmouseenter = () => this.highlightVariable(name);
            s.settingEl.onmouseleave = () => this.clearHighlight();

            const val = info.value.toLowerCase();
            const n = name.toLowerCase();

            // Helper to check if it's a color
            const isColor = (varName: string, varVal: string) => {
                const colorKeywords = ['color', 'bg', 'background', 'accent', 'text', 'border', 'shadow', 'fill', 'stroke'];
                const v = varVal.toLowerCase();
                // If it's a size variable, it's NOT a color even if it looks like one (unlikely but safe)
                if (varName.includes('size') || varName.includes('padding') || varName.includes('margin') || varName.includes('radius') || varName.includes('gap')) return false;
                return colorKeywords.some(k => varName.toLowerCase().includes(k)) ||
                    v.startsWith('#') || v.startsWith('rgb') || v.startsWith('hsl') || v === 'transparent';
            };

            if (!info.isDefined) {
                s.setDesc('Theme variable. Override it?');
                s.addButton(btn => btn.setButtonText('Override').onClick(() => {
                    let defaultValue = 'inherit';
                    if (isColor(name, '')) defaultValue = '#ffffff';
                    else if (n.includes('size') || n.includes('padding') || n.includes('margin')) defaultValue = '1rem';
                    else if (n.includes('radius')) defaultValue = '8px';

                    this.updateCssVariable(name, defaultValue);
                    this.renderEditor();
                }));
                return;
            }

            // 1. Dropdowns for keywords
            if (n.includes('display')) {
                s.addDropdown(d => d.addOptions({ 'block': 'block', 'flex': 'flex', 'grid': 'grid', 'inline-block': 'inline-block', 'none': 'none' })
                    .setValue(val).onChange(v => this.updateCssVariable(name, v)));
            } else if (n.includes('flex-direction')) {
                s.addDropdown(d => d.addOptions({ 'row': 'row', 'column': 'column', 'row-reverse': 'row-reverse', 'column-reverse': 'column-reverse' })
                    .setValue(val).onChange(v => this.updateCssVariable(name, v)));
            } else if (n.includes('align-items') || n.includes('justify-content')) {
                s.addDropdown(d => d.addOptions({ 'center': 'center', 'flex-start': 'start', 'flex-end': 'end', 'space-between': 'between', 'space-around': 'around' })
                    .setValue(val).onChange(v => this.updateCssVariable(name, v)));
            } else if (n.includes('font-weight')) {
                s.addDropdown(d => d.addOptions({ 'normal': 'normal', 'bold': 'bold', '100': '100', '300': '300', '400': '400', '500': '500', '600': '600', '700': '700', '900': '900' })
                    .setValue(val).onChange(v => this.updateCssVariable(name, v)));
            }
            // 2. Color Picker
            else if (isColor(name, info.value)) {
                s.addColorPicker(color => color
                    .setValue(val.includes('var(') ? '#ffffff' : info.value)
                    .onChange(v => this.updateCssVariable(name, v)));
            }
            // 3. Slider for sizes
            else if (val.includes('px') || val.includes('rem') || val.includes('%') || val.includes('em') || /^-?\d+\.?\d*$/.test(val)) {
                const numMatch = val.match(/(-?\d+\.?\d*)/);
                const unit = val.replace(/[0-9.-]/g, '').trim() || (n.includes('weight') ? '' : 'px');
                const currentVal = numMatch ? parseFloat(numMatch[0]) : 0;

                const valueInput = s.controlEl.createEl('input', {
                    type: 'text',
                    cls: 'slider-value-input',
                    value: info.value
                });

                s.addSlider(slider => {
                    slider
                        .setLimits(0, unit === '%' ? 100 : (unit === 'rem' || unit === 'em' ? 10 : (unit === '' ? 900 : 200)), unit === 'rem' || unit === 'em' ? 0.1 : (unit === '' ? 100 : 1))
                        .setValue(currentVal)
                        .onChange(v => {
                            const newVal = `${v}${unit}`;
                            valueInput.value = newVal;
                            this.updateCssVariable(name, newVal);
                        });

                    valueInput.oninput = (e) => {
                        const inputVal = (e.target as HTMLInputElement).value;
                        const match = inputVal.match(/(-?\d+\.?\d*)/);
                        if (match) {
                            const num = parseFloat(match[0]);
                            slider.setValue(num);
                            this.updateCssVariable(name, inputVal);
                        }
                    };
                });
            }
            // 4. Generic Text
            else {
                s.addText(text => text
                    .setValue(info.value)
                    .onChange(v => this.updateCssVariable(name, v)));
            }

            // Reset button
            if (this.initialVariables.has(name)) {
                s.addExtraButton(btn => btn.setIcon('reset').setTooltip('Reset to initial value').onClick(() => {
                    this.updateCssVariable(name, this.initialVariables.get(name)!);
                    this.renderEditor();
                }));
            }

            // Delete button
            s.addExtraButton(btn => btn.setIcon('trash').setTooltip('Remove variable').onClick(() => {
                this.removeCssVariable(name);
                this.renderEditor();
            }));
        });
    }

    highlightVariable(name: string) {
        if (!this.previewEl || !this.previewEl.shadowRoot) return;
        const shadow = this.previewEl.shadowRoot;

        // 1. Find selectors using this variable
        const css = this.template.css;
        const selectors: string[] = [];

        // Match blocks: selector { ... var(--name) ... }
        // This is a simplified parser but works for most widget CSS
        const blockRegex = /([^{}]+)\{[^{}]*var\(\s*name\s*\)[^{}]*\}/g.source.replace('name', name);
        const regex = new RegExp(blockRegex, 'g');
        let match;
        while ((match = regex.exec(css)) !== null) {
            const sel = match[1].trim();
            // Split multiple selectors: .a, .b -> [.a, .b]
            sel.split(',').forEach(s => {
                const trimmed = s.trim();
                if (trimmed) selectors.push(trimmed);
            });
        }

        if (selectors.length === 0) return;

        // 2. Apply highlight to matching elements
        selectors.forEach(selector => {
            try {
                if (selector === ':host') {
                    const content = shadow.querySelector('.widget-content');
                    if (content) content.classList.add('widget-visual-highlight');
                } else {
                    const elements = shadow.querySelectorAll(selector);
                    elements.forEach(el => el.classList.add('widget-visual-highlight'));
                }
            } catch (e) {
                // Ignore invalid selectors
            }
        });
    }

    clearHighlight() {
        if (!this.previewEl || !this.previewEl.shadowRoot) return;
        const shadow = this.previewEl.shadowRoot;
        shadow.querySelectorAll('.widget-visual-highlight').forEach(el => {
            el.classList.remove('widget-visual-highlight');
        });
    }

    magicScanAndInject() {
        let css = this.template.css;

        // 1. Extract :host block to avoid scanning existing variables
        const hostMatch = css.match(/:host\s*\{([\s\S]*?)\}/);
        let hostContent = hostMatch ? hostMatch[1] : '';
        let restOfCss = css.replace(/:host\s*\{[\s\S]*?\}/, '');

        const replacements: { prop: string, val: string, varName: string }[] = [];
        const valueMap = new Map<string, string>(); // "prop:val" -> varName

        // Comprehensive list of properties to convert
        const propRegex = /(padding(?:-top|-bottom|-left|-right)?|margin(?:-top|-bottom|-left|-right)?|border-radius|background(?:-color)?|color|font-size|font-weight|gap|width|height|max-width|max-height|min-width|min-height|flex|line-height|letter-spacing|box-shadow|opacity|outline|border(?:-color|-width)?|display|flex-direction|align-items|justify-content|text-align|text-transform|overflow(?:-x|-y)?|cursor|transition|z-index)\s*:\s*([^;!{}]+);/g;

        let match;
        while ((match = propRegex.exec(restOfCss)) !== null) {
            const prop = match[1];
            const val = match[2].trim();

            // Skip if already a variable or too complex (e.g. calc with multiple vars)
            if (val.includes('var(')) continue;

            const key = `${prop}:${val}`;
            if (!valueMap.has(key)) {
                // Check if this value is already defined in :host under a different name
                const existingVarMatch = hostContent.match(new RegExp(`(--[a-zA-Z0-9_-]+)\\s*:\\s*${val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*;`));
                if (existingVarMatch) {
                    valueMap.set(key, existingVarMatch[1]);
                } else {
                    const index = valueMap.size + 1;
                    const varName = `--w-${prop.replace(/[^a-zA-Z0-9]/g, '-')}-${index}`; // Sanitize prop for var name
                    valueMap.set(key, varName);
                    replacements.push({ prop, val, varName });
                }
            }
        }

        if (replacements.length === 0 && valueMap.size === 0) {
            this.injectCommonVariables();
            return;
        }

        // 2. Inject new variables into :host
        if (replacements.length > 0) {
            const newVars = replacements.map(r => `    ${r.varName}: ${r.val};`).join('\n');
            if (!hostMatch) {
                css = `:host {\n${newVars}\n}\n` + css;
            } else {
                // Insert new variables right after the opening brace of :host
                css = css.replace(/:host\s*\{/, `:host {\n${newVars}\n`);
            }
        }

        // 3. Replace hardcoded values with variables in the rest of the CSS
        valueMap.forEach((varName, key) => {
            const [prop, val] = key.split(':');
            const escapedVal = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Use a regex that ensures we match the property and value exactly
            const rRegex = new RegExp(`${prop}\\s*:\\s*${escapedVal}\\s*;`, 'g');
            restOfCss = restOfCss.replace(rRegex, `${prop}: var(${varName});`);
        });

        // Reconstruct CSS
        if (hostMatch) {
            // Update hostContent with new variables if we didn't just prepend them
            const updatedHostMatch = css.match(/:host\s*\{([\s\S]*?)\}/);
            const updatedHostBlock = updatedHostMatch ? updatedHostMatch[0] : '';
            this.template.css = updatedHostBlock + '\n' + restOfCss;
        } else {
            this.template.css = css;
        }

        this.updatePreview();
    }

    removeCssVariable(name: string) {
        const regex = new RegExp(`${name}\\s*:\\s*([^;]+);\\n?`, 'g');
        this.template.css = this.template.css.replace(regex, '');
        this.updatePreview();
    }

    injectCommonVariables() {
        const commonVars = `
:host {
    --widget-bg: var(--background-secondary);
    --widget-accent: var(--interactive-accent);
    --widget-radius: 12px;
    --widget-padding: 1rem;
    --widget-text: var(--text-normal);
}
`;
        if (!this.template.css.includes(':host')) {
            this.template.css = commonVars + this.template.css;
        } else {
            this.template.css = this.template.css.replace(':host {', `:host {\n    --widget-bg: var(--background-secondary);\n    --widget-accent: var(--interactive-accent);\n    --widget-radius: 12px;\n    --widget-padding: 1rem;\n    --widget-text: var(--text-normal);`);
        }
        this.updatePreview();
    }

    promptAddVariable(container: HTMLElement) {
        // Simple prompt for now, could be a small modal or inline form
        const name = prompt("Variable name (e.g. --my-color):", "--");
        if (name && name.startsWith('--')) {
            const value = prompt("Initial value (e.g. #ff0000 or 10px):", "#");
            if (value) {
                if (!this.template.css.includes(':host')) {
                    this.template.css = `:host {\n    ${name}: ${value};\n}\n` + this.template.css;
                } else {
                    this.template.css = this.template.css.replace(':host {', `:host {\n    ${name}: ${value};`);
                }
                this.renderEditor();
                this.updatePreview();
            }
        }
    }

    updateCssVariable(name: string, value: string) {
        const regex = new RegExp(`(${name}\\s*:\\s*)([^;]+);`, 'g');
        if (regex.test(this.template.css)) {
            this.template.css = this.template.css.replace(regex, `$1${value};`);
        } else {
            // Inject into :host
            if (!this.template.css.includes(':host')) {
                this.template.css = `:host {\n    ${name}: ${value};\n}\n` + this.template.css;
            } else {
                this.template.css = this.template.css.replace(':host {', `:host {\n    ${name}: ${value};`);
            }
        }
        this.updatePreview(true);
    }

    updatePreview(onlyCss = false) {
        if (!this.previewEl) return;

        let shadow = this.previewEl.shadowRoot;
        if (!shadow) {
            shadow = this.previewEl.attachShadow({ mode: 'open' });
        }

        let styleEl = shadow.querySelector('style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            shadow.appendChild(styleEl);
        }

        styleEl.textContent = `
            :host { display: block; background: var(--background-primary); padding: 20px; border-radius: 8px; min-height: 100%; color: var(--text-normal); }
            ${this.template.css}
            
            /* Highlight styles */
            .widget-visual-highlight {
                outline: 2px solid var(--interactive-accent) !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 0 4px rgba(var(--interactive-accent-rgb), 0.4) !important;
                transition: outline 0.2s ease, box-shadow 0.2s ease !important;
                z-index: 10000 !important;
            }
        `;

        if (onlyCss) return;

        // Full update (HTML + JS)
        let contentEl = shadow.querySelector('.widget-content');
        if (contentEl) contentEl.remove();

        contentEl = document.createElement('div');
        contentEl.className = 'widget-content';
        contentEl.innerHTML = this.template.html;
        shadow.appendChild(contentEl);

        this.runPreviewJs(shadow);
    }

    runPreviewJs(shadow: ShadowRoot) {
        const jsContent = this.template.js;
        if (!jsContent || !jsContent.trim()) return;

        try {
            const apiProxy = {
                root: shadow,
                data: this.template.data || {},
                saveState: async (newData: any) => {
                    this.template.data = newData;
                },
                getState: () => this.template.data || {},
                getWidgetState: (id: string) => Promise.resolve({}),
                updateWidgetState: (id: string, data: any) => Promise.resolve(),
                getNoteState: () => Promise.resolve({}),
                updateNoteState: (data: any) => Promise.resolve(),
                t: (key: string, ...args: any[]) => this.plugin.t(key as any, ...args),
            };

            // Extract function names for export
            const functionNames: string[] = [];
            const functionRegex = /(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
            let match;
            while ((match = functionRegex.exec(jsContent)) !== null) {
                if (match[1] !== 'init') functionNames.push(match[1]);
            }
            if (/function\s+init\s*\(/.test(jsContent)) functionNames.push('init');

            const functionExports = functionNames.map(name =>
                `if (typeof ${name} === 'function') api.${name} = ${name};`
            ).join('\n');

            const wrappedScript = `
                ${jsContent}
                try { ${functionExports} } catch(e) {}
            `;

            const scriptFunction = new Function('api', `with(api) { ${wrappedScript} }`);
            scriptFunction(apiProxy);
            this.plugin.bindEvents(shadow, apiProxy);
        } catch (e) {
            console.error('Preview JS Error:', e);
        }
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
                .onChange(async (value) => {
                    this.plugin.settings.language = value as Language;
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
                .onChange(async (value) => {
                    this.plugin.settings.maxWidthUnit = value as 'percent' | 'pixel';
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

        new Setting(containerEl)
            .setName(this.plugin.t('updatePlugin'))
            .setDesc(this.plugin.t('updatePluginDesc'))
            .addButton(btn => btn
                .setButtonText(this.plugin.t('updatePluginBtn'))
                .setCta()
                .onClick(async () => {
                    btn.setDisabled(true);
                    btn.setButtonText("...");
                    await this.plugin.updatePlugin();
                    btn.setDisabled(false);
                    btn.setButtonText(this.plugin.t('updatePluginBtn'));
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
