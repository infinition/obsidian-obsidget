"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => WidgetPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// i18n.ts
var I18N_DICT = {
  en: {
    galleryTitle: "\u{1F9E9} Widget Gallery",
    searchPlaceholder: "Search widgets...",
    allTags: "All Tags",
    addWidget: "Add Widget",
    insert: "Insert",
    edit: "Edit",
    delete: "Delete",
    previous: "Previous",
    next: "Next",
    pageInfo: "Page {0} of {1}",
    noResults: "No widgets found matching your search.",
    deleteConfirm: "Are you sure you want to delete this widget?",
    widgetDeleted: "Widget deleted.",
    widgetSaved: "Widget saved.",
    widgetName: "Widget Name",
    widgetId: "Widget ID (filename)",
    widgetTags: "Widget Tags (comma separated)",
    htmlContent: "HTML Content",
    cssContent: "CSS Content",
    jsContent: "JS Content",
    saveWidget: "Save Widget",
    cancel: "Cancel",
    createWidget: "Create Widget",
    editWidget: "Edit {0}",
    loadedMsg: "\u2705 {0} widgets and {1} tags loaded",
    loadedNoTagsMsg: "\u2705 {0} widgets loaded (no tags)",
    noTagsFound: "No tags found in widgets.",
    settingsGalleryPath: "Gallery Directory Path",
    settingsGalleryPathDesc: "Path to the folder where widget JSON files are stored.",
    settingsLanguage: "Language",
    settingsLanguageDesc: "Select the plugin language.",
    saveToGallery: "Save to Gallery",
    settingsTitle: "Widget CSS Settings",
    insertError: "Open a note to insert the widget.",
    insertWidgetMenu: "Insert Widget",
    settingsGithub: "GitHub Repository",
    settingsGithubDesc: "Visit the project on GitHub for updates and contributions.",
    syncGalleryBtn: "Update Gallery",
    syncGalleryDesc: "Download new widgets from the community gallery (won't overwrite your existing widgets).",
    syncSuccess: "\u2705 Gallery updated! {0} new widgets added.",
    syncError: "\u274C Error updating gallery: {0}"
  },
  fr: {
    galleryTitle: "\u{1F9E9} Galerie de Widgets",
    searchPlaceholder: "Rechercher des widgets...",
    allTags: "Tous les tags",
    addWidget: "Ajouter un widget",
    insert: "Ins\xE9rer",
    edit: "Modifier",
    delete: "Supprimer",
    previous: "Pr\xE9c\xE9dent",
    next: "Suivant",
    pageInfo: "Page {0} sur {1}",
    noResults: "Aucun widget trouv\xE9 pour votre recherche.",
    deleteConfirm: "\xCAtes-vous s\xFBr de vouloir supprimer ce widget ?",
    widgetDeleted: "Widget supprim\xE9.",
    widgetSaved: "Widget enregistr\xE9.",
    widgetName: "Nom du widget",
    widgetId: "ID du widget (nom du fichier)",
    widgetTags: "Tags du widget (s\xE9par\xE9s par des virgules)",
    htmlContent: "Contenu HTML",
    cssContent: "Contenu CSS",
    jsContent: "Contenu JS",
    saveWidget: "Enregistrer le widget",
    cancel: "Annuler",
    createWidget: "Cr\xE9er un widget",
    editWidget: "Modifier {0}",
    loadedMsg: "\u2705 {0} widgets et {1} tags charg\xE9s",
    loadedNoTagsMsg: "\u2705 {0} widgets charg\xE9s (aucun tag)",
    noTagsFound: "Aucun tag trouv\xE9 dans les widgets.",
    settingsGalleryPath: "Chemin du r\xE9pertoire de la galerie",
    settingsGalleryPathDesc: "Chemin vers le dossier o\xF9 sont stock\xE9s les fichiers JSON des widgets.",
    settingsLanguage: "Langue",
    settingsLanguageDesc: "S\xE9lectionnez la langue du plugin.",
    saveToGallery: "Enregistrer dans la galerie",
    settingsTitle: "Param\xE8tres Widget CSS",
    insertError: "Ouvrez une note pour ins\xE9rer le widget.",
    insertWidgetMenu: "Ins\xE9rer un widget",
    settingsGithub: "D\xE9p\xF4t GitHub",
    settingsGithubDesc: "Visitez le projet sur GitHub pour les mises \xE0 jour et les contributions.",
    syncGalleryBtn: "Mettre \xE0 jour la galerie",
    syncGalleryDesc: "T\xE9l\xE9chargez les nouveaux widgets de la galerie communautaire (n'\xE9crase pas vos widgets existants).",
    syncSuccess: "\u2705 Galerie mise \xE0 jour ! {0} nouveaux widgets ajout\xE9s.",
    syncError: "\u274C Erreur lors de la mise \xE0 jour : {0}"
  },
  es: {
    galleryTitle: "\u{1F9E9} Galer\xEDa de Widgets",
    searchPlaceholder: "Buscar widgets...",
    allTags: "Todas las etiquetas",
    addWidget: "A\xF1adir widget",
    insert: "Insertar",
    edit: "Editar",
    delete: "Eliminar",
    previous: "Anterior",
    next: "Siguiente",
    pageInfo: "P\xE1gina {0} de {1}",
    noResults: "No se encontraron widgets que coincidan con su b\xFAsqueda.",
    deleteConfirm: "\xBFEst\xE1s seguro de que quieres eliminar este widget?",
    widgetDeleted: "Widget eliminado.",
    widgetSaved: "Widget guardado.",
    widgetName: "Nombre del widget",
    widgetId: "ID del widget (nombre de archivo)",
    widgetTags: "Etiquetas del widget (separadas por comas)",
    htmlContent: "Contenido HTML",
    cssContent: "Contenido CSS",
    jsContent: "Contenido JS",
    saveWidget: "Guardar widget",
    cancel: "Cancelar",
    createWidget: "Crear widget",
    editWidget: "Editar {0}",
    loadedMsg: "\u2705 {0} widgets y {1} etiquetas cargados",
    loadedNoTagsMsg: "\u2705 {0} widgets charg\xE9s (sin etiquetas)",
    noTagsFound: "No se encontraron etiquetas en los widgets.",
    settingsGalleryPath: "Ruta del directorio de la galer\xEDa",
    settingsGalleryPathDesc: "Ruta a la carpeta donde se almacenan los archivos JSON de los widgets.",
    settingsLanguage: "Idioma",
    settingsLanguageDesc: "Seleccione el idioma del plugin.",
    saveToGallery: "Guardar en la galer\xEDa",
    settingsTitle: "Ajustes de Widget CSS",
    insertError: "Abra una nota para insertar le widget.",
    insertWidgetMenu: "Insertar widget",
    settingsGithub: "Repositorio GitHub",
    settingsGithubDesc: "Visite el proyecto en GitHub para actualizaciones y contribuciones.",
    syncGalleryBtn: "Actualizar galer\xEDa",
    syncGalleryDesc: "Descarga nuevos widgets de la galerie communautaire (no sobrescribir\xE1 tus widgets existentes).",
    syncSuccess: "\u2705 \xA1Galer\xEDa actualizada! {0} nuevos widgets a\xF1adidos.",
    syncError: "\u274C Error al actualizar la galer\xEDa: {0}"
  },
  de: {
    galleryTitle: "\u{1F9E9} Widget-Galerie",
    searchPlaceholder: "Widgets suchen...",
    allTags: "Alle Tags",
    addWidget: "Widget hinzuf\xFCgen",
    insert: "Einf\xFCgen",
    edit: "Bearbeiten",
    delete: "L\xF6schen",
    previous: "Zur\xFCck",
    next: "Weiter",
    pageInfo: "Seite {0} von {1}",
    noResults: "Keine Widgets gefunden, die Ihrer Suche entsprechen.",
    deleteConfirm: "Sind Sie sicher, dass Sie dieses Widget l\xF6schen m\xF6chten?",
    widgetDeleted: "Widget gel\xF6scht.",
    widgetSaved: "Widget gespeichert.",
    widgetName: "Widget-Name",
    widgetId: "Widget-ID (Dateiname)",
    widgetTags: "Widget-Tags (kommagetrennt)",
    htmlContent: "HTML-Inhalt",
    cssContent: "CSS-Inhalt",
    jsContent: "JS-Inhalt",
    saveWidget: "Widget speichern",
    cancel: "Abbrechen",
    createWidget: "Widget erstellen",
    editWidget: "{0} bearbeiten",
    loadedMsg: "\u2705 {0} Widgets und {1} Tags geladen",
    loadedNoTagsMsg: "\u2705 {0} Widgets geladen (keine Tags)",
    noTagsFound: "Keine Tags in den Widgets gefunden.",
    settingsGalleryPath: "Galerieverzeichnis-Pfad",
    settingsGalleryPathDesc: "Pfad zum Ordner, in dem die Widget-JSON-Dateien gespeichert sind.",
    settingsLanguage: "Sprache",
    settingsLanguageDesc: "W\xE4hlen Sie die Sprache des Plugins aus.",
    saveToGallery: "In Galerie speichern",
    settingsTitle: "Widget CSS Einstellungen",
    insertError: "\xD6ffnen Sie eine Notiz, um das Widget einzuf\xFCgen.",
    insertWidgetMenu: "Widget einf\xFCgen",
    settingsGithub: "GitHub-Repository",
    settingsGithubDesc: "Besuchen Sie das Projekt auf GitHub f\xFCr Updates und Beitr\xE4ge.",
    syncGalleryBtn: "Galerie aktualisieren",
    syncGalleryDesc: "Laden Sie neue Widgets aus der Community-Galerie herunter (Ihre vorhandenen Widgets werden nicht \xFCberschrieben).",
    syncSuccess: "\u2705 Galerie aktualisiert! {0} neue Widgets hinzugef\xFCgt.",
    syncError: "\u274C Fehler beim Aktualisieren der Galerie: {0}"
  },
  pt: {
    galleryTitle: "\u{1F9E9} Galeria de Widgets",
    searchPlaceholder: "Pesquisar widgets...",
    allTags: "Todas as etiquetas",
    addWidget: "Adicionar Widget",
    insert: "Inserir",
    edit: "Editar",
    delete: "Excluir",
    previous: "Anterior",
    next: "Pr\xF3ximo",
    pageInfo: "P\xE1gina {0} de {1}",
    noResults: "Nenhum widget encontrado correspondente \xE0 sua pesquisa.",
    deleteConfirm: "Tem certeza de que deseja excluir este widget?",
    widgetDeleted: "Widget exclu\xEDdo.",
    widgetSaved: "Widget salvo.",
    widgetName: "Nome do Widget",
    widgetId: "ID do Widget (nome do arquivo)",
    widgetTags: "Etiquetas do Widget (separadas por v\xEDrgulas)",
    htmlContent: "Conte\xFAdo HTML",
    cssContent: "Conte\xFAdo CSS",
    jsContent: "Conte\xFAdo JS",
    saveWidget: "Salvar Widget",
    cancel: "Cancelar",
    createWidget: "Criar Widget",
    editWidget: "Editar {0}",
    loadedMsg: "\u2705 {0} widgets e {1} etiquetas carregados",
    loadedNoTagsMsg: "\u2705 {0} widgets carregados (sem etiquetas)",
    noTagsFound: "Nenhuma etiqueta encontrada nos widgets.",
    settingsGalleryPath: "Caminho do diret\xF3rio da galeria",
    settingsGalleryPathDesc: "Caminho para a pasta onde os fichiers JSON do widget s\xE3o armazenados.",
    settingsLanguage: "Idioma",
    settingsLanguageDesc: "Selecione o idioma do plugin.",
    saveToGallery: "Salvar na galeria",
    settingsTitle: "Configura\xE7\xF5es do Widget CSS",
    insertError: "Abra uma nota para inserir o widget.",
    insertWidgetMenu: "Inserir Widget",
    settingsGithub: "Reposit\xF3rio GitHub",
    settingsGithubDesc: "Visite o projeto no GitHub para atualiza\xE7\xF5es e contribui\xE7\xF5es.",
    syncGalleryBtn: "Atualizar Galeria",
    syncGalleryDesc: "Baixe novos widgets da galeria da comunidade (n\xE3o substituir\xE1 seus widgets existentes).",
    syncSuccess: "\u2705 Galeria atualizada! {0} novos widgets adicionados.",
    syncError: "\u274C Erro ao atualizar a galeria: {0}"
  }
};

// main.ts
var DEFAULT_SETTINGS = {
  galleryPath: ".obsidian/plugins/obsidian-obsidget/gallery",
  language: "en",
  githubUrl: "https://github.com/infinition/obsidian-obsidget"
};
var WidgetPlugin = class extends import_obsidian.Plugin {
  t(key, ...args) {
    const lang = this.settings.language || "en";
    let text = I18N_DICT[lang][key] || I18N_DICT["en"][key] || key;
    args.forEach((arg, i) => {
      text = text.replace(`{${i}}`, String(arg));
    });
    return text;
  }
  async onload() {
    await this.loadSettings();
    await this.ensureDirectory(this.settings.galleryPath);
    this.addSettingTab(new WidgetSettingTab(this.app, this));
    this.addRibbonIcon("layout", this.t("galleryTitle"), () => {
      new WidgetGalleryModal(this.app, this).open();
    });
    this.addCommand({
      id: "open-widget-gallery",
      name: this.t("galleryTitle"),
      callback: () => {
        new WidgetGalleryModal(this.app, this).open();
      }
    });
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        menu.addItem((item) => {
          item.setTitle(this.t("insertWidgetMenu")).setIcon("layout").onClick(async () => {
            new WidgetGalleryModal(this.app, this, editor).open();
          });
        });
      })
    );
    this.registerMarkdownCodeBlockProcessor("widget", async (source, el, ctx) => {
      const sections = source.split("---");
      let firstSection = sections[0].trim();
      let widgetId = "";
      let htmlContent = "";
      let cssContent = sections[1] || "";
      let jsContent = sections[2] || "";
      let inlineDataStr = sections[3]?.trim();
      let isLinked = false;
      const sanitizeId = (id) => id.replace(/[^a-zA-Z0-9_-]/g, "");
      if (firstSection.startsWith("ID:")) {
        const lines = firstSection.split("\n");
        widgetId = sanitizeId(lines[0].replace("ID:", "").trim());
        htmlContent = lines.slice(1).join("\n").trim();
      } else {
        htmlContent = firstSection;
      }
      if (!htmlContent && widgetId) {
        isLinked = true;
        const galleryPath = (0, import_obsidian.normalizePath)(`${this.settings.galleryPath}/${widgetId}.json`);
        try {
          if (await this.app.vault.adapter.exists(galleryPath)) {
            const content = await this.app.vault.adapter.read(galleryPath);
            const template = JSON.parse(content);
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
      const sectionInfo = ctx.getSectionInfo(el);
      const lineStart = sectionInfo?.lineStart || 0;
      const filePath = ctx.sourcePath;
      const instanceId = widgetId || `${filePath.replace(/\//g, "_")}__line${lineStart}`;
      const container = el.createDiv({ cls: "widget-instance-container" });
      const btnContainer = container.createDiv({ cls: "widget-action-buttons" });
      btnContainer.style.position = "absolute";
      btnContainer.style.top = "10px";
      btnContainer.style.right = "10px";
      btnContainer.style.display = "flex";
      btnContainer.style.gap = "5px";
      btnContainer.style.zIndex = "100";
      const createBtn = (text, title, onClick) => {
        const btn = btnContainer.createEl("button", { text, cls: "widget-save-to-gallery-btn" });
        btn.title = title;
        btn.onclick = (e) => {
          e.stopPropagation();
          onClick(e);
        };
        return btn;
      };
      if (isLinked) {
        createBtn("\u270F\uFE0F", "Edit this widget in gallery", () => {
          const template = {
            id: widgetId,
            name: widgetId,
            html: htmlContent,
            css: cssContent,
            js: jsContent
          };
          new WidgetEditorModal(this.app, this, async (saved) => {
            await this.saveToGallery(saved);
            new import_obsidian.Notice(`Widget "${saved.name}" updated!`);
            this.app.workspace.trigger("layout-change");
          }, template).open();
        });
      } else {
        createBtn("\u{1F4BE}", "Save to gallery", () => {
          const template = {
            id: widgetId || `widget_${Date.now()}`,
            name: widgetId || "New Widget",
            html: htmlContent,
            css: cssContent,
            js: jsContent
          };
          new WidgetEditorModal(this.app, this, async (saved) => {
            await this.saveToGallery(saved);
            new import_obsidian.Notice(`Widget "${saved.name}" saved to gallery!`);
          }, template).open();
        });
        createBtn("\u{1F517}", "Convert to Linked Widget (Short Code)", async () => {
          if (!widgetId) {
            new import_obsidian.Notice("Please save the widget with an ID first (or add ID: name to the block).");
            return;
          }
          const galleryPath = (0, import_obsidian.normalizePath)(`${this.settings.galleryPath}/${widgetId}.json`);
          if (!await this.app.vault.adapter.exists(galleryPath)) {
            new import_obsidian.Notice(`Widget "${widgetId}" not found in gallery. Please save it first.`);
            return;
          }
          const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
          if (view) {
            const editor = view.editor;
            const section = ctx.getSectionInfo(el);
            if (section) {
              const rangeStart = { line: section.lineStart, ch: 0 };
              const rangeEnd = { line: section.lineEnd, ch: 0 };
              const newContent = `\`\`\`widget
ID: ${widgetId}
\`\`\``;
              editor.replaceRange(newContent, rangeStart, rangeEnd);
              new import_obsidian.Notice("Converted to Linked Widget!");
            }
          }
        });
      }
      const shadow = container.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = `
                :host { display: block; position: relative; width: 100%; }
                ${cssContent}
            `;
      shadow.appendChild(style);
      const innerDiv = document.createElement("div");
      innerDiv.innerHTML = htmlContent;
      shadow.appendChild(innerDiv);
      const api = {
        root: shadow,
        saveState: async (data) => {
          const section = ctx.getSectionInfo(el);
          if (section) {
            const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
            if (file instanceof import_obsidian.TFile) {
              const newDataStr = JSON.stringify(data, null, 2);
              try {
                await this.app.vault.process(file, (oldContent) => {
                  const lines = oldContent.split("\n");
                  if (section.lineStart + 1 >= lines.length || section.lineEnd > lines.length) return oldContent;
                  const blockLines = lines.slice(section.lineStart + 1, section.lineEnd);
                  const blockContent = blockLines.join("\n");
                  const blockSections = blockContent.split("---");
                  const currentDataStr = blockSections[3]?.trim() || "";
                  if (newDataStr === currentDataStr) return oldContent;
                  const newSections = [...blockSections];
                  while (newSections.length < 3) newSections.push("\n");
                  newSections[3] = `
${newDataStr}
`;
                  const newBlockContent = newSections.join("---");
                  lines.splice(section.lineStart + 1, section.lineEnd - section.lineStart - 1, newBlockContent);
                  return lines.join("\n");
                });
                return;
              } catch (e) {
                console.error("Inline save failed:", e);
              }
            }
          }
        },
        getState: async () => {
          if (inlineDataStr) {
            try {
              return JSON.parse(inlineDataStr);
            } catch (e) {
            }
          }
          return null;
        },
        instanceId
      };
      try {
        const apiProxy = new Proxy(api, {
          get(target, prop) {
            if (prop in target) return target[prop];
            return window[prop];
          },
          set(target, prop, value) {
            target[prop] = value;
            return true;
          }
        });
        const scriptFunction = new Function("api", `with(api) { ${jsContent} }`);
        scriptFunction(apiProxy);
        this.bindEvents(shadow, apiProxy);
      } catch (e) {
        console.error("Widget JS Error:", e);
      }
    });
  }
  bindEvents(root, apiProxy) {
    const elements = root.querySelectorAll("*");
    elements.forEach((el) => {
      const attrs = el.attributes;
      if (!attrs) return;
      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        if (attr.name.startsWith("on") && attr.name !== "on") {
          const eventName = attr.name.substring(2);
          const code = attr.value;
          el.addEventListener(eventName, (e) => {
            try {
              const eventFunc = new Function("api", "event", `with(api) { ${code} }`);
              eventFunc(apiProxy, e);
            } catch (err) {
              console.error(`Error in widget event [${eventName}]:`, err);
            }
          });
          el[attr.name] = null;
        }
      }
    });
  }
  async ensureDirectory(path) {
    if (!await this.app.vault.adapter.exists(path)) {
      await this.app.vault.adapter.mkdir(path);
    }
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async getGalleryWidgets() {
    const exists = await this.app.vault.adapter.exists(this.settings.galleryPath);
    if (!exists) return [];
    const files = await this.app.vault.adapter.list(this.settings.galleryPath);
    const templates = [];
    for (const filePath of files.files) {
      if (filePath.endsWith(".json")) {
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
  async saveToGallery(template) {
    const filePath = (0, import_obsidian.normalizePath)(`${this.settings.galleryPath}/${template.id}.json`);
    await this.app.vault.adapter.write(filePath, JSON.stringify(template, null, 2));
  }
  async deleteFromGallery(id) {
    const filePath = (0, import_obsidian.normalizePath)(`${this.settings.galleryPath}/${id}.json`);
    if (await this.app.vault.adapter.exists(filePath)) {
      await this.app.vault.adapter.remove(filePath);
    }
  }
  async syncGallery() {
    try {
      const apiUrl = "https://api.github.com/repos/infinition/obsidian-obsidget/contents/gallery";
      const response = await (0, import_obsidian.requestUrl)({ url: apiUrl });
      if (response.status !== 200) {
        throw new Error(`GitHub API returned ${response.status}`);
      }
      const files = response.json;
      let addedCount = 0;
      for (const file of files) {
        if (file.name.endsWith(".json")) {
          const localPath = (0, import_obsidian.normalizePath)(`${this.settings.galleryPath}/${file.name}`);
          if (!await this.app.vault.adapter.exists(localPath)) {
            const fileResponse = await (0, import_obsidian.requestUrl)({ url: file.download_url });
            if (fileResponse.status === 200) {
              await this.app.vault.adapter.write(localPath, fileResponse.text);
              addedCount++;
            }
          }
        }
      }
      new import_obsidian.Notice(this.t("syncSuccess", addedCount));
    } catch (e) {
      console.error("Gallery sync failed:", e);
      new import_obsidian.Notice(this.t("syncError", e.message));
    }
  }
};
var WidgetGalleryModal = class extends import_obsidian.Modal {
  constructor(app, plugin, editor) {
    super(app);
    this.searchQuery = "";
    this.currentPage = 1;
    this.itemsPerPage = 50;
    this.allTemplates = [];
    this.filteredTemplates = [];
    this.allTags = [];
    this.selectedTag = "";
    this.targetEditor = null;
    this.plugin = plugin;
    this.isMobile = app.isMobile;
    this.targetEditor = editor || null;
  }
  async onOpen() {
    const { contentEl } = this;
    this.modalEl.addClass("widget-gallery-modal");
    contentEl.empty();
    const header = contentEl.createDiv({ cls: "gallery-header" });
    header.createEl("h2", { text: this.plugin.t("galleryTitle") });
    const closeBtn = header.createEl("button", { text: "\u2715", cls: "gallery-close-btn" });
    closeBtn.onclick = () => this.close();
    const controlsContainer = contentEl.createDiv({ cls: "gallery-controls" });
    const searchContainer = controlsContainer.createDiv({ cls: "gallery-search-container" });
    this.searchInputEl = searchContainer.createEl("input", {
      attr: { type: "text", placeholder: this.plugin.t("searchPlaceholder") },
      cls: "gallery-search-input"
    });
    this.searchInputEl.oninput = (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.updateClearButton();
      this.currentPage = 1;
      this.filterAndRender();
    };
    this.clearBtnEl = searchContainer.createSpan({ cls: "gallery-search-clear", text: "\u2715" });
    this.clearBtnEl.onclick = () => {
      this.searchInputEl.value = "";
      this.searchQuery = "";
      this.updateClearButton();
      this.currentPage = 1;
      this.filterAndRender();
    };
    this.updateClearButton();
    searchContainer.createSpan({ cls: "gallery-search-icon", text: "\u{1F50D}" });
    const tagContainer = controlsContainer.createDiv({ cls: "gallery-tag-container" });
    this.tagSelectEl = tagContainer.createEl("select", { cls: "gallery-tag-select" });
    this.tagSelectEl.onchange = () => {
      this.selectedTag = this.tagSelectEl.value;
      this.currentPage = 1;
      this.filterAndRender();
    };
    const addBtn = controlsContainer.createEl("button", { text: `+ ${this.plugin.t("addWidget")}`, cls: "mod-cta gallery-add-btn" });
    addBtn.onclick = () => this.openWidgetEditor();
    this.gridEl = contentEl.createDiv({ cls: "widget-gallery-grid" });
    this.allTemplates = await this.plugin.getGalleryWidgets();
    this.extractAllTags();
    this.populateTagDropdown();
    const msg = this.allTags.length > 0 ? this.plugin.t("loadedMsg", this.allTemplates.length, this.allTags.length) : this.plugin.t("loadedNoTagsMsg", this.allTemplates.length);
    this.showToast(msg);
    this.filterAndRender();
    if (!this.isMobile) {
      contentEl.onscroll = () => {
        if (contentEl.scrollTop + contentEl.clientHeight >= contentEl.scrollHeight - 100) {
          this.loadMore();
        }
      };
    }
  }
  showToast(message) {
    const toast = document.createElement("div");
    toast.className = "gallery-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    void toast.offsetHeight;
    toast.classList.add("is-visible");
    setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => toast.remove(), 500);
    }, 3e3);
  }
  updateClearButton() {
    if (this.searchQuery.length > 0) {
      this.clearBtnEl.style.display = "flex";
    } else {
      this.clearBtnEl.style.display = "none";
    }
  }
  extractAllTags() {
    const tagSet = /* @__PURE__ */ new Set();
    this.allTemplates.forEach((t) => {
      if (t.tags && Array.isArray(t.tags)) {
        t.tags.forEach((tag) => tagSet.add(tag.toLowerCase().trim()));
      }
    });
    this.allTags = Array.from(tagSet).sort();
  }
  populateTagDropdown() {
    this.tagSelectEl.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = `\u{1F3F7}\uFE0F ${this.plugin.t("allTags")}`;
    if (this.selectedTag === "") allOption.selected = true;
    this.tagSelectEl.appendChild(allOption);
    this.allTags.forEach((tag) => {
      const option = document.createElement("option");
      option.value = tag;
      option.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
      if (this.selectedTag === tag) option.selected = true;
      this.tagSelectEl.appendChild(option);
    });
  }
  filterAndRender() {
    let searchText = this.searchQuery;
    let tagFromSearch = "";
    if (searchText.startsWith("#")) {
      const tagMatch = searchText.slice(1).trim();
      if (tagMatch.length > 0) {
        tagFromSearch = tagMatch;
        searchText = "";
      }
    }
    const activeTag = tagFromSearch || this.selectedTag;
    this.filteredTemplates = this.allTemplates.filter((t) => {
      const matchesSearch = searchText.length === 0 || t.name.toLowerCase().includes(searchText) || t.id.toLowerCase().includes(searchText);
      const matchesTags = activeTag.length === 0 || t.tags && t.tags.some((tag) => tag.toLowerCase().includes(activeTag));
      return matchesSearch && matchesTags;
    });
    this.gridEl.empty();
    this.renderVisibleWidgets();
    this.renderPagination();
  }
  renderVisibleWidgets() {
    let toShow = [];
    if (this.isMobile) {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      toShow = this.filteredTemplates.slice(start, start + this.itemsPerPage);
    } else {
      toShow = this.filteredTemplates.slice(0, this.currentPage * this.itemsPerPage);
    }
    if (toShow.length === 0 && this.currentPage === 1) {
      this.gridEl.createEl("p", { text: this.plugin.t("noResults"), cls: "no-results" });
      return;
    }
    toShow.forEach((template) => this.renderWidgetCard(template));
  }
  renderWidgetCard(template) {
    const card = this.gridEl.createDiv({ cls: "widget-card" });
    const cardHeader = card.createDiv({ cls: "widget-card-header" });
    cardHeader.createEl("h3", { text: template.name });
    if (template.tags && template.tags.length > 0) {
      const tagsContainer = cardHeader.createDiv({ cls: "widget-card-tags" });
      template.tags.slice(0, 3).forEach((tag) => {
        tagsContainer.createSpan({ text: tag, cls: "widget-tag" });
      });
      if (template.tags.length > 3) {
        tagsContainer.createSpan({ text: `+${template.tags.length - 3}`, cls: "widget-tag more" });
      }
    }
    const preview = card.createDiv({ cls: "widget-preview" });
    const shadow = preview.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `:host { display: block; padding: 10px; width: 100%; max-width: 100%; overflow: hidden; pointer-events: none; user-select: none; } * { pointer-events: none !important; max-width: 100%; box-sizing: border-box; } img, video, iframe { max-width: 100%; height: auto; } ${template.css}`;
    shadow.appendChild(style);
    const innerWrap = document.createElement("div");
    innerWrap.innerHTML = template.html;
    shadow.appendChild(innerWrap);
    const actions = card.createDiv({ cls: "widget-card-actions" });
    const insertBtn = actions.createEl("button", { text: `\u{1F4E5} ${this.plugin.t("insert")}`, cls: "mod-cta" });
    insertBtn.onclick = () => {
      this.insertWidget(template);
    };
    const editBtn = actions.createEl("button", { text: `\u270F\uFE0F ${this.plugin.t("edit")}` });
    editBtn.onclick = () => this.openWidgetEditor(template);
    const deleteBtn = actions.createEl("button", { text: "\u{1F5D1}\uFE0F", cls: "mod-warning" });
    deleteBtn.onclick = async () => {
      if (confirm(this.plugin.t("deleteConfirm"))) {
        await this.plugin.deleteFromGallery(template.id);
        new import_obsidian.Notice(this.plugin.t("widgetDeleted"));
        this.allTemplates = await this.plugin.getGalleryWidgets();
        this.extractAllTags();
        this.populateTagDropdown();
        this.filterAndRender();
      }
    };
  }
  renderPagination() {
    const existingPagination = this.contentEl.querySelector(".gallery-pagination");
    if (existingPagination) existingPagination.remove();
    if (!this.isMobile) return;
    const totalPages = Math.ceil(this.filteredTemplates.length / this.itemsPerPage);
    if (totalPages <= 1) return;
    const pagination = this.contentEl.createDiv({ cls: "gallery-pagination" });
    const prevBtn = pagination.createEl("button", { text: `\u2190 ${this.plugin.t("previous")}` });
    prevBtn.disabled = this.currentPage === 1;
    prevBtn.onclick = () => {
      this.currentPage--;
      this.gridEl.empty();
      this.renderVisibleWidgets();
      this.renderPagination();
      this.contentEl.scrollTop = 0;
    };
    pagination.createSpan({ text: ` ${this.plugin.t("pageInfo", this.currentPage, totalPages)} ` });
    const nextBtn = pagination.createEl("button", { text: `${this.plugin.t("next")} \u2192` });
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
      nextBatch.forEach((template) => this.renderWidgetCard(template));
    }
  }
  async insertWidget(template) {
    const activeView = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    const editor = this.targetEditor || activeView?.editor;
    if (!editor && !activeView) {
      new import_obsidian.Notice(this.plugin.t("insertError"));
      return;
    }
    const uniqueId = `widget_${Date.now()}`;
    const content = `

\`\`\`widget
ID: ${uniqueId}
${template.html}
---
${template.css}
---
${template.js}
\`\`\``;
    if (editor) {
      const cursor = editor.getCursor();
      editor.replaceRange(content, cursor);
      new import_obsidian.Notice(this.plugin.t("widgetSaved"));
      this.close();
    } else if (activeView) {
      const activeFile = activeView.file;
      if (activeFile) {
        await this.app.vault.append(activeFile, content);
        new import_obsidian.Notice(this.plugin.t("widgetSaved"));
        this.close();
      }
    }
  }
  openWidgetEditor(template) {
    new WidgetEditorModal(this.app, this.plugin, async (saved) => {
      this.allTemplates = await this.plugin.getGalleryWidgets();
      this.extractAllTags();
      this.populateTagDropdown();
      this.filterAndRender();
    }, template).open();
  }
};
var WidgetEditorModal = class extends import_obsidian.Modal {
  constructor(app, plugin, onSave, template) {
    super(app);
    this.plugin = plugin;
    this.onSave = onSave;
    this.template = template ? { ...template, tags: template.tags || [] } : {
      id: `widget_${Date.now()}`,
      name: "Nouveau Widget",
      html: "<div>Hello Widget</div>",
      css: "div { color: var(--text-accent); }",
      js: 'console.log("Widget loaded");',
      tags: []
    };
    this.originalId = template ? template.id : "";
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass("widget-editor-modal");
    const isNew = !this.template.name || this.template.name === "Nouveau Widget";
    contentEl.createEl("h2", { text: isNew ? `\u2728 ${this.plugin.t("createWidget")}` : this.plugin.t("editWidget", this.template.name) });
    new import_obsidian.Setting(contentEl).setName(this.plugin.t("widgetName")).addText((text) => text.setValue(this.template.name).onChange((v) => this.template.name = v));
    new import_obsidian.Setting(contentEl).setName(this.plugin.t("widgetId")).addText((text) => text.setValue(this.template.id).onChange((v) => {
      this.template.id = v.replace(/[^a-zA-Z0-9_-]/g, "");
    }));
    new import_obsidian.Setting(contentEl).setName(this.plugin.t("widgetTags")).addText((text) => text.setValue((this.template.tags || []).join(", ")).onChange((v) => {
      this.template.tags = v.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
    }));
    this.createEditorField(contentEl, this.plugin.t("htmlContent"), this.template.html, (v) => this.template.html = v);
    this.createEditorField(contentEl, this.plugin.t("cssContent"), this.template.css, (v) => this.template.css = v);
    this.createEditorField(contentEl, this.plugin.t("jsContent"), this.template.js, (v) => this.template.js = v);
    const footer = contentEl.createDiv({ cls: "modal-footer" });
    const cancelBtn = footer.createEl("button", { text: this.plugin.t("cancel") });
    cancelBtn.onclick = () => this.close();
    const saveBtn = footer.createEl("button", { text: `\u{1F4BE} ${this.plugin.t("saveWidget")}`, cls: "mod-cta" });
    saveBtn.onclick = async () => {
      if (!this.template.id) {
        new import_obsidian.Notice("ID is required");
        return;
      }
      if (this.originalId && this.originalId !== this.template.id) {
        await this.plugin.deleteFromGallery(this.originalId);
      }
      await this.plugin.saveToGallery(this.template);
      new import_obsidian.Notice(this.plugin.t("widgetSaved"));
      this.onSave(this.template);
      this.close();
    };
  }
  createEditorField(container, name, value, onChange) {
    const wrap = container.createDiv({ cls: "editor-field-wrap" });
    wrap.createEl("label", { text: name });
    const area = wrap.createEl("textarea");
    area.value = value;
    area.oninput = (e) => onChange(e.target.value);
    return area;
  }
};
var WidgetSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: this.plugin.t("settingsTitle") });
    new import_obsidian.Setting(containerEl).setName(this.plugin.t("settingsLanguage")).setDesc(this.plugin.t("settingsLanguageDesc")).addDropdown((dropdown) => dropdown.addOption("en", "English").addOption("fr", "Fran\xE7ais").addOption("es", "Espa\xF1ol").addOption("de", "Deutsch").addOption("pt", "Portugu\xEAs").setValue(this.plugin.settings.language).onChange(async (value) => {
      this.plugin.settings.language = value;
      await this.plugin.saveSettings();
      this.display();
    }));
    new import_obsidian.Setting(containerEl).setName(this.plugin.t("settingsGalleryPath")).setDesc(this.plugin.t("settingsGalleryPathDesc")).addText((text) => text.setValue(this.plugin.settings.galleryPath).onChange(async (value) => {
      this.plugin.settings.galleryPath = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("hr");
    containerEl.createEl("h3", { text: "Community & Updates" });
    new import_obsidian.Setting(containerEl).setName(this.plugin.t("settingsGithub")).setDesc(this.plugin.t("settingsGithubDesc")).addButton((btn) => btn.setButtonText("GitHub").setCta().onClick(() => {
      window.open(this.plugin.settings.githubUrl, "_blank");
    }));
    new import_obsidian.Setting(containerEl).setName(this.plugin.t("syncGalleryBtn")).setDesc(this.plugin.t("syncGalleryDesc")).addButton((btn) => btn.setButtonText("Update").onClick(async () => {
      btn.setDisabled(true);
      btn.setButtonText("...");
      await this.plugin.syncGallery();
      btn.setDisabled(false);
      btn.setButtonText("Update");
    }));
  }
};
