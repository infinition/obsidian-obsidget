# ObsidGet

Obsidian plugin to create, manage, and reuse interactive widgets using HTML, CSS, and JavaScript.



## 🚀 Key Features

- **Shadow DOM Isolation**: Every widget is rendered in its own Shadow DOM, preventing style leaks and script conflicts with Obsidian's UI.
- **In-Note Data Persistence**: Widget state is stored directly inside the Markdown code block. Your notes are fully portable and self-contained.
- **Modern Widget Gallery**: A beautiful, responsive gallery with tag filtering and search to manage your templates.
- **Context Menu Integration**: Right-click anywhere in your note to quickly insert a widget from your gallery.
- **Live Editor**: Create and modify widget templates with a built-in editor, including custom ID/filename management.
- **Smart Sync**: Update your widget collection directly from the community gallery in settings without updating the plugin.
- **Multilingual Support**: Fully translated into English, French, Spanish, German, and Portuguese.
- **Premium Aesthetics**: Designed to feel like a native part of Obsidian with support for CSS variables and smooth animations.

## 📥 Installation

### Manual Installation
1. Download the latest release from the [Releases](https://github.com/infinition/obsidian-obsidget/releases) page .
2. Extract the `obsidian-obsidget.zip` into your vault's `.obsidian/plugins/` folder.
3. Reload Obsidian and enable **ObsidGet** in the Community Plugins settings.

### Via BRAT
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat).
2. Go to **Settings** > **BRAT** > **Plugins** > **Add Beta plugin**.
3. Paste the repository URL: `https://github.com/infinition/obsidian-obsidget`.
4. Enable the plugin.

## 🛠️ How to use a Widget

Widgets are defined using a `widget` code block with 4 optional sections separated by `---`:

```widget
ID: my-unique-id
<div id="counter">0</div>
<button id="btn">Click Me</button>

---

:host { 
    display: flex; 
    flex-direction: column; 
    align-items: center;
    padding: 1rem;
    background: var(--background-secondary);
    border-radius: 8px;
}
button {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
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

### The API
Each widget has access to a powerful `api` object:
- `root`: The Shadow Root of the widget. Use `root.querySelector` instead of `document`.
- `saveState(data)`: Saves a JSON object **directly into the 4th section** of the code block in your note.
- `getState()`: Retrieves the JSON object from the 4th section.
- `instanceId`: A unique identifier for the widget instance.

## 👨‍💻 Widget Development Guide

### Event Handling in Shadow DOM

Widgets run inside an isolated Shadow DOM. This affects how you should handle events. There are **two approaches** you can use:

#### ✅ Recommended: Using `addEventListener` in JavaScript

This is the most reliable approach. Attach event listeners programmatically in your `init()` function:

```javascript
async function init() {
    var saved = await api.getState();
    // ... restore state ...
    
    // Attach event listeners
    api.root.getElementById('btn-add').onclick = addItem;
    api.root.getElementById('btn-clear').onclick = clearAll;
    api.root.getElementById('my-input').oninput = handleInput;
}

function addItem() {
    // Your logic here
}

function clearAll() {
    // Your logic here
}

init();
```

#### ✅ Alternative: Using `onclick` in HTML

You can use inline `onclick` attributes in your HTML. The plugin automatically extracts all `function` declarations from your JavaScript and makes them available to event handlers:

**HTML:**
```html
<button onclick="addWater(250)">+250ml</button>
<button onclick="resetWater()">Reset</button>
```

**JavaScript:**
```javascript
function addWater(amount) {
    currentWater += amount;
    update();
}

function resetWater() {
    currentWater = 0;
    update();
}

function init() {
    // ...
}
init();
```

> **Important:** Functions must be declared using the `function` keyword syntax. Arrow functions assigned to variables (`const myFunc = () => {}`) will NOT work with `onclick` handlers.

### Best Practices

| Do ✅ | Don't ❌ |
|-------|----------|
| Use `api.root.getElementById()` | Use `document.getElementById()` |
| Use `api.root.querySelector()` | Use `document.querySelector()` |
| Use `function myFunc() {}` for onclick | Use `const myFunc = () => {}` for onclick |
| Use `api.saveState()` and `api.getState()` | Use `localStorage` |
| Use CSS variables like `var(--text-normal)` | Use hardcoded colors |

### Complete Widget Template

Here's a minimal working template:

```javascript
// State
var counter = 0;

// Functions
function increment() {
    counter++;
    render();
    api.saveState({ counter: counter });
}

function render() {
    api.root.getElementById('display').innerText = counter;
}

// Initialization
async function init() {
    var saved = await api.getState();
    if (saved) counter = saved.counter;
    
    // Option 1: Attach events in JS (recommended)
    api.root.getElementById('btn').onclick = increment;
    
    render();
}

init();
```

## 🎨 Widget Gallery

Access the gallery via the **Ribbon Icon** (layout icon), the command **"Open Widget Gallery"**, or the **Right-click Context Menu**.

- **Search & Filter**: Find widgets by name or tags (e.g., search `#tools` to see all tool-related widgets).
- **Insert**: Quickly add a template to your current note at the cursor position.
- **Edit**: Modify a template's HTML, CSS, JS, and Tags.
- **Custom ID**: Manually set the filename for your templates in the gallery.
- **Save to Gallery**: Hover over any rendered widget in your notes and click the 💾 button to save it as a template.

## 📱 Mobile Ready

The gallery and widgets are fully responsive. On mobile devices, the interface adapts to provide a seamless touch experience, with stacked action buttons and optimized layouts.

## 🤝 Contributing & Community Widgets

We would love to grow the built-in widget collection! If you have created a cool widget and want to share it:
1. Fork this repository.
2. Add your widget's `.json` file to the `gallery/` directory.
3. Submit a **Pull Request**.

Your widget could help others enhance their Obsidian experience!

## ⚙️ Settings

- **Gallery Path**: Choose where your `.json` templates are stored (default: `.obsidian/plugins/obsidian-obsidget/gallery`).
- **Language**: Select your preferred language (English, French, Spanish, German, or Portuguese).
- **GitHub Repository**: Direct link to the project for updates, bug reports, and contributions.
- **Update Gallery**: A one-click button to download the latest community widgets from GitHub without overwriting your local modifications.


## Star History

<a href="https://www.star-history.com/#infinition/obsidian-obsidget&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=infinition/obsidian-obsidget&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=infinition/obsidian-obsidget&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=infinition/obsidian-obsidget&type=date&legend=top-left" />
 </picture>
</a>
