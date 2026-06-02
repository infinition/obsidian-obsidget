# ObsidGet for Obsidian

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white) [![Release](https://img.shields.io/github/v/release/infinition/obsidian-obsidget?style=flat)](https://github.com/infinition/obsidian-obsidget/releases) [![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-7C3AED?style=flat&logo=obsidian&logoColor=white)](https://obsidian.md/plugins?id=obsidget) [![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/infinition)

<img width="1354" height="967" alt="ObsidGet interface" src="https://github.com/user-attachments/assets/14d584c8-6932-4ac9-b00a-ba7251450bc5" />
<img width="1351" height="558" alt="ObsidGet gallery" src="https://github.com/user-attachments/assets/3f627afa-b487-4e2d-828d-68dd6bef011e" />

An Obsidian plugin for creating, managing, and reusing interactive widgets with HTML, CSS, and JavaScript. Each widget runs in an isolated Shadow DOM environment so styles and scripts do not affect the rest of the vault.

Plugin ID: `obsidget`

Used by: [Obsidian Nova](https://github.com/infinition/obsidian-nova) for its imported widget library.

---

## Features

- Shadow DOM isolation per widget: no style or script leaks.
- Widget state saved inside the Markdown code block; notes stay portable.
- Vault and data access: read/write JSON/CSV files, interact with note frontmatter.
- Template gallery with tagging, search, and Smart Sync for community templates.
- Right-click context menu to insert a widget anywhere.
- Live split-view editor with real-time preview.
- Visual CSS editor: sliders and color pickers for detected CSS variables.
- Self-update from the latest GitHub release without leaving Obsidian.
- Multilingual: English, French, Spanish, German, Portuguese.

---

## Widget API (within a widget's JS)

```js
// Read a file
const data = await api.readFile("notes/data.json");

// Save widget state (persisted in the code block)
await api.saveState({ count: 5 });

// Access the unique instance ID (for multi-instance widgets)
console.log(api.instanceId);
```

---

## Settings

| Setting | Description |
|---------|-------------|
| Gallery Path | Location of `.json` template files |
| Language | Interface language |
| Max Widget Width | Percentage or pixel limit |
| Update Gallery | Download latest community widgets |
| Update All Widgets | Update all widget code in vault while preserving data |
| Update Plugin | Fetch the latest plugin release from GitHub |

---

## Contributing widgets

1. Fork the repository.
2. Add your widget's `.json` file to the `gallery/` directory.
3. Open a pull request.

---

## Development

```bash
npm install
npm run dev    # watch mode
npm run build
```

---

## Star History

<a href="https://www.star-history.com/?repos=infinition%2Fobsidian-obsidget&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=infinition/obsidian-obsidget&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=infinition/obsidian-obsidget&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=infinition/obsidian-obsidget&type=date&legend=top-left" />
 </picture>
</a>

---

## License

MIT. See [LICENSE](LICENSE).
