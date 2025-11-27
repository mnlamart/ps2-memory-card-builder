# PS2 Memory Card Manager 💾

A web application for managing PlayStation 2 memory card files (.ps2, .mc2) with a modern, user-friendly interface. Upload, browse, export, and manage your PS2 save files all in one place.

## Features

### 🎮 Memory Card Management
- **Upload & Import**: Upload PS2 memory card files (.ps2, .mc2) or import individual save files
- **Create Empty Cards**: Create new empty memory cards with custom names
- **Rename Cards**: Give your memory cards user-friendly names
- **Browse Contents**: View all save files on your memory cards with detailed metadata
- **Game Titles**: Automatically extract and display game titles from save files
- **Save File Metadata**: View product codes, regions, protection status, file modes, and timestamps
- **Save Thumbnails**: Display view.ico thumbnails for save files (with automatic caching)
- **Export Saves**: Export save files in multiple formats (.max, .psu, .sps, .xps, .cbs, .psv)
- **Delete Saves**: Remove unwanted save files from memory cards
- **Format Cards**: Wipe and format memory cards to start fresh
- **Check Errors**: Validate memory card file system integrity
- **Search & Sort**: Find saves quickly with search and sorting capabilities
- **Storage Visualization**: See how much space is used and available on each card

### 🛠️ Technical Features
- Built on [The Epic Stack](https://www.epicweb.dev/epic-stack) foundation
- React Router v7 with type-safe routes
- File-based storage (no database required)
- Comprehensive test suite (Vitest + Playwright)
- Modern UI with shadcn/ui and Tailwind CSS
- File upload handling with size validation
- Integration with [mymcplusplus](https://github.com/Adubbz/mymcplusplus) for PS2 memory card operations
- Shift-JIS encoding support for Japanese game titles
- Icon extraction and caching for save file thumbnails
- User-friendly naming system with automatic filename sanitization
- React Grab integration for AI-assisted development (dev mode)

## Tech Stack

- **Framework**: React Router v7 (formerly Remix)
- **Language**: TypeScript
- **Storage**: File-based (memory cards stored in filesystem)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Testing**: Vitest, Playwright
- **Deployment**: Fly.io

## Prerequisites

- Node.js 20+ 
- npm or pnpm
- Python 3.11+ (for mymcplusplus)
- mymcplusplus installed: `pip install mymcplusplus`

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ps2-memory-card-manager
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Build the application:
```bash
npm run setup
```

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Testing

Run unit tests:
```bash
npm test
```

Run E2E tests:
```bash
npm run test:e2e:dev
```

Run all tests:
```bash
npm run validate
```

### Building for Production

```bash
npm run build
npm start
```

## Usage

1. **Create a Memory Card**: Click "Create New Card" to create an empty memory card with a custom name, or "Upload Memory Card" to upload an existing .ps2 or .mc2 file
2. **Browse Saves**: Click on a memory card to see all save files with game titles and metadata
3. **View Save Details**: Click on a save file to see comprehensive information including product code, region, protection status, and thumbnail
4. **Export Saves**: Click on a save file and choose your export format (.max, .psu, .sps, .xps, .cbs, .psv)
5. **Import Saves**: Import save files into your memory cards
6. **Manage Cards**: Rename, format, check, download, or delete your memory cards

## Project Structure

```
app/
  routes/                    # Application routes
    memory-cards/            # Memory card management routes
      $id.tsx               # Memory card detail layout
      $id.index.tsx         # Save files list view
      $id.save.$saveId.tsx  # Save file detail page
      $id.import.tsx        # Import save files
      $id.rename.tsx         # Rename memory card
      $id.delete.ts          # Delete memory card
      $id.download.ts        # Download memory card
      $id.format.ts          # Format memory card
      $id.check.ts           # Check memory card
      new.tsx                # Upload memory card
      new-create.tsx         # Create empty memory card
    resources/               # Resource routes
      extracts.$saveId.view.png.ts  # Serve cached save thumbnails
  components/               # React components
    app-header.tsx          # Shared application header
    memory-card-card.tsx    # Memory card list item
    save-file-item.tsx      # Save file list item
  utils/                    # Utility functions
    mymcplusplus.server.ts  # PS2 memory card operations (mymcplusplus integration)
    memory-card.server.ts   # Memory card file management
    memory-card-metadata.server.ts  # User-friendly names and metadata
    file-handler.server.ts  # File system utilities
uploads/                    # Uploaded files (gitignored)
  memory-cards/            # Memory card files (.ps2, .mc2)
    .metadata/             # Metadata for user-friendly names
  exports/                 # Exported save files
  extracts/                # Extracted icons and thumbnails (cached)
tests/                      # Test files
```

## Built on The Epic Stack

This project is built on [The Epic Stack](https://www.epicweb.dev/epic-stack), an opinionated project starter that allows teams to ship ideas to production faster on a stable foundation.

## License

[Add your license here]

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open a GitHub issue.
