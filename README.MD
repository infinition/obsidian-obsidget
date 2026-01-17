
# ObsidGet

**ObsidGet** is an Obsidian plugin that allows you to create, manage, and reuse interactive widgets using standard HTML, CSS, and JavaScript.

Every widget runs in its own isolated environment (Shadow DOM), ensuring that your scripts and styles do not conflict with your Obsidian theme or other plugins.

## ✨ Key Features

- **Shadow DOM Isolation**: Widgets are encapsulated. Styles and scripts won't leak into the rest of Obsidian.
- **In-Note Persistence**: Widget state is saved directly in the Markdown code block. Notes remain portable.
- **Vault & Data Access**: Read/write files (JSON, CSV, etc.) and interact with Note Properties (YAML/Frontmatter).
- **Template Gallery**: Built-in system to manage, tag, and search widgets. Includes "Smart Sync" for community templates.
- **Context Menu**: Right-click anywhere to insert a widget instantly.
- **Live Editor**: Create/modify templates with a built-in editor.
- **Multilingual**: Available in English, French, Spanish, German, and Portuguese.
- **Native Integration**: Supports Obsidian CSS variables and adapts to light/dark modes.

## 📥 Installation

### Manual Installation
1. Download the latest release from the [Releases page](https://github.com/infinition/obsidian-obsidget/releases).
2. Extract `obsidian-obsidget.zip` into your vault's `.obsidian/plugins/` folder.
3. Reload Obsidian and enable **ObsidGet**.

### Via BRAT
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat).
2. Go to **Settings > BRAT > Plugins > Add Beta plugin**.
3. Enter the repository URL: `https://github.com/infinition/obsidian-obsidget`.
4. Enable the plugin.

---

## 🎨 Using the Widget Gallery

The easiest way to use ObsidGet is via the Gallery. You don't need to write code to get started.

### How to use
1.  **Open the Gallery**:
    * **Right-click** anywhere in your note and select **Insert Widget**.
    * Alternatively, click the Ribbon Icon (layout icon) or use the Command Palette ("Open Widget Gallery").
2.  **Search & Filter**: Find widgets by name or tags.
3.  **Insert**: Click "Insert" to add the widget to your note at the cursor position.
4.  **Sync**: The gallery includes a "Smart Sync" feature to download community widgets without overwriting your changes.

### 🚀 Pro Examples
The gallery includes advanced widgets to demonstrate the power of the new API:
*   🛠️ **YAML API Tester Pro**: Select any note and edit its Properties (YAML) directly in JSON format.
*   📊 **Data Explorer Pro**: A universal editor for your vault's data files (JSON, CSV, LOG, XML, etc.).
*   📂 **File API Tester Pro**: Test file reading/writing and manage custom log files with searchable paths.
*   🔗 **Cross-Widget Controller Pro**: Remotely read and write data to any other widget in any note. Perfect for dashboards.

### Saving & Managing
* **Save to Gallery**: Hover over any widget in your note and click the 💾 icon to save it as a template.
* **Custom IDs**: You can manually set filenames for your templates in the editor.

### 📱 Mobile Ready
The gallery and widgets are responsive. The interface adapts to touch screens with optimized layouts and stacked action buttons.

---

## 🛠️ Developer Guide: Creating Widgets

For developers, widgets are defined in a `widget` code block separated into 4 sections by `---`:

1.  **HTML** (Structure)
2.  **CSS** (Style)
3.  **JavaScript** (Logic)
4.  **Data** (JSON State - auto-managed)

### Widget Structure Example

```widget
ID: my-unique-id
<div id="counter">0</div>
<button id="btn">Click Me</button>

---

:host {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
}
button {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border: none;
    padding: 5px 10px;
    cursor: pointer;
}

---

// JavaScript Logic
const { root, saveState, getState } = api;
const btn = root.getElementById('btn');
const display = root.getElementById('counter');

getState().then(state => {
    let count = state ? state.count : 0;
    display.textContent = count;

    btn.onclick = () => {
        count++;
        display.textContent = count;
        saveState({ count });
    };
});

---

{
  "count": 5
}

```

### Event Handling in Shadow DOM

Since widgets run in Shadow DOM, you have two ways to handle events:

**1. Recommended: Using `addEventListener` (JS)**
Attach listeners programmatically in your `init()` function.

```javascript
async function init() {
    api.root.getElementById('btn-add').onclick = addItem;
}
function addItem() { /* logic */ }
init();

```

**2. Alternative: Using `onclick` (HTML)**
You can use inline attributes, but functions must be declared clearly (no arrow functions).

```html
<button onclick="addWater(250)">+250ml</button>

```

### Best Practices

| Do ✅ | Don't ❌ |
| --- | --- |
| Use `api.root.getElementById()` | Use `document.getElementById()` |
| Use `api.root.querySelector()` | Use `document.querySelector()` |
| Use `function myFunc() {}` | Use `const myFunc = () => {}` (for inline `onclick`) |
| Use `api.saveState()` / `api.getState()` | Use `localStorage` |
| Use Obsidian CSS variables (e.g., `var(--text-normal)`) | Use hardcoded colors (e.g., `#000`) |

### 🎨 Styling the Container
To style the widget's outer container (the element that holds your HTML), use the `:host` selector in your CSS:

```css
:host {
    display: block;
    background: var(--background-secondary);
    border-radius: 8px;
    padding: 1rem;
    border: 1px solid var(--background-modifier-border);
}
```

### 🔔 Obsidian UI Components
You can use standard Obsidian UI components like `Notice` directly in your JavaScript:

```javascript
function onSave() {
    api.saveState({ data: "..." });
    new Notice("✅ Data saved successfully!");
}
```

### 🔍 Debugging Tips
- **Console**: Use `console.log()` in your JS. It will appear in the standard Obsidian Developer Tools (`Ctrl+Shift+I` or `Cmd+Opt+I`).
- **Inspect**: You can inspect a widget's Shadow DOM by using the element picker in the Developer Tools.
- **Status Bar**: Use a `div` in your HTML as a status bar to display messages during development.

---

## 📚 API Reference

Every widget has access to the global `api` object.

### Core

| Method | Arguments | Description |
| --- | --- | --- |
| `api.root` | - | The Shadow Root of your widget. Use this for all DOM selections. |
| `api.saveState(data)` | `data`: any | Saves a JSON object directly into the 4th section of the code block. |
| `api.getState()` | - | Returns a Promise resolving to the saved JSON state. |
| `api.instanceId` | - | A unique identifier for the widget instance. |

### Metadata & Properties (YAML)

Interact with the Frontmatter of any note.

| Method | Arguments | Description |
| --- | --- | --- |
| `api.getFrontmatter(path?)` | `path`: string (opt) | Returns the YAML properties of a note as an object. Defaults to current note. |
| `api.updateFrontmatter(data, path?)` | `data`: object, `path`: string (opt) | Merges the provided object into the note's YAML properties. |
| `api.getWidgetState(id, path?)` | `id`: string, `path`: string (opt) | Reads the JSON data of another widget by its ID. |
| `api.updateWidgetState(id, data, path?)` | `id`: string, `data`: any, `path`: string (opt) | Updates the JSON data of another widget by its ID. |

```javascript
// Example: Update status in current note
await api.updateFrontmatter({ 
    status: "completed", 
    last_edit: new Date().toISOString() 
});

```

### Vault File System

Read and write files within the vault.

| Method | Arguments | Description |
| --- | --- | --- |
| `api.getFiles(ext?)` | `ext`: string (opt) | Returns an array of file paths in the vault. Optional extension filter (e.g., `'csv'`). |
| `api.readFile(path)` | `path`: string | Reads the content of a file as a string. Returns `null` if not found. |
| `api.writeFile(path, content)` | `path`: string, `content`: string | Writes the specified content to a file. Automatically creates parent folders. |

```javascript
// Example 1: Read a config file
const content = await api.readFile("data/config.json");
if (content) {
    const config = JSON.parse(content);
    console.log(config.theme);
}

// Example 2: Read a markdown file and append content
const path = "Journal/Daily Note.md";
let mdContent = await api.readFile(path) || "";
mdContent += "\n- [ ] New task added from widget at " + new Date().toLocaleTimeString();
await api.writeFile(path, mdContent);
```

// Example: Fetch external data
const response = await api.requestUrl({ 
    url: "https://api.example.com/data",
    method: "GET",
    headers: { "Content-Type": "application/json" }
});
const json = response.json;
```

### 📂 File Operations Cookbook

Examples for common file types and operations within the vault.

#### 📝 JSON Files (Config/Data)
```javascript
const path = "data/settings.json";

// Read and Modify
const raw = await api.readFile(path);
const config = raw ? JSON.parse(raw) : { theme: "dark", enabled: true };
config.lastUsed = new Date().toISOString();

// Write (creates folders if needed)
await api.writeFile(path, JSON.stringify(config, null, 2));
```

#### 📊 CSV Files (Spreadsheets)
```javascript
const path = "reports/stats.csv";

// Read and Parse
const content = await api.readFile(path);
const rows = api.parseCSV(content || "date,value");

// Add a row and Save
rows.push({ date: "2024-01-01", value: "100" });
const newCSV = api.stringifyCSV(rows);
await api.writeFile(path, newCSV);
```

#### 📑 Markdown & Logs (Text/Append)
```javascript
// Append to a log file
const logPath = "Logs/activity.log";
let logs = await api.readFile(logPath) || "";
logs += `[${new Date().toLocaleString()}] Action performed\n`;
await api.writeFile(logPath, logs);

// Search for all markdown files in a folder
const allNotes = api.getFiles("md").filter(p => p.startsWith("Projects/"));
```

#### 🔗 Cross-Widget Interaction
```javascript
// Update the score of a widget named "leaderboard" in another note
const targetNote = "Games/Level 1.md";
const targetId = "leaderboard";

// 1. Get current data
const data = await api.getWidgetState(targetId, targetNote) || { scores: [] };

// 2. Modify
data.scores.push({ name: "Player 1", score: 1000 });

// 3. Save back
await api.updateWidgetState(targetId, data, targetNote);
new Notice("Leaderboard updated!");
```

### 🚀 Master Example: Using all API methods
This example demonstrates how to combine multiple API methods to create a complex workflow (fetching data, parsing CSV, updating metadata, and saving state).

```javascript
async function syncData() {
    // 1. Core: Access the Shadow Root to show status
    const statusEl = api.root.getElementById('status');
    statusEl.innerText = "Syncing...";

    // 2. Network: Fetch external CSV data (bypassing CORS)
    const response = await api.requestUrl({ url: "https://example.com/data.csv" });
    const csvRaw = response.text;

    // 3. Utilities: Parse the CSV data
    const data = api.parseCSV(csvRaw);

    // 4. Vault: List all log files and write the sync result
    const logFiles = api.getFiles('log');
    const syncLogPath = "Logs/sync-report.log";
    await api.writeFile(syncLogPath, `Synced ${data.length} items at ${new Date().toISOString()}`);

    // 5. Metadata: Update the current note's properties
    await api.updateFrontmatter({ 
        last_sync: new Date().toISOString(),
        item_count: data.length 
    });

    // 6. Persistence: Save the widget's internal state
    await api.saveState({ 
        lastSyncStatus: "success",
        instance: api.instanceId // Use the unique instance ID
    });

    statusEl.innerText = "Sync Complete!";
}

// 7. Initialization: Load saved state on startup
async function init() {
    const saved = await api.getState();
    if (saved && saved.lastSyncStatus === "success") {
        console.log("Widget initialized with instance ID:", api.instanceId);
    }
}

init();
```

---

## ⚙️ Settings

* **Gallery Path**: Location of your `.json` template files.
* **Language**: English, French, Spanish, German, Portuguese.
* **GitHub Repository**: Link to the project.
* **Update Gallery**: Download latest community widgets.
* **Update All Widgets in Vault**: Updates the code of all widgets in your notes to the latest gallery version, while **preserving your data**.
* **Max Widget Width**: Control the maximum width (percentage or pixels).

## 🤝 Contributing

Contributions are welcome! If you have created a cool widget:

1. Fork this repository.
2. Add your widget's `.json` file to the `gallery/` directory.
3. Submit a Pull Request.

---

## Star History

<a href="https://www.star-history.com/#infinition/obsidian-obsidget&type=date&legend=top-left">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=infinition/obsidian-obsidget&type=date&theme=dark&legend=top-left" />
<source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=infinition/obsidian-obsidget&type=date&legend=top-left" />
<img alt="Star History Chart" src="https://api.star-history.com/svg?repos=infinition/obsidian-obsidget&type=date&legend=top-left" />
</picture>
</a>