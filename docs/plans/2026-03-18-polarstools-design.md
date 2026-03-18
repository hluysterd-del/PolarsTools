# PolarsTools Design Doc

## Overview
PolarsTools is a static website (GitHub Pages) providing 8 modding tools for the VR game GRAB. It uses the public GRAB API (`api.slin.dev`) to download, browse, and manipulate levels without requiring authentication.

## GRAB API Endpoints
All public, no auth required for read operations:
- `GET api.slin.dev/grab/v1/download/{uid}/{ts}/{iter}` - Raw .level protobuf binary
- `GET api.slin.dev/grab/v1/details/{uid}/{ts}` - Level metadata JSON (title, creators, iteration, images)
- `GET api.slin.dev/grab/v1/list?user_id={id}` - All levels by user
- `GET api.slin.dev/grab/v1/list?type=user_name&search_term={name}` - Search users
- `GET api.slin.dev/grab/v1/statistics/{uid}/{ts}` - Level statistics
- Images: `grab-images.slin.dev/{image_key}`
- Level viewer links: `grabvr.quest/levels/viewer?level={uid}:{ts}`

## Tools (8)
1. **Level Downloader** - Paste grabvr.quest link -> download .level file
2. **Level Browser** - Search/filter all verified levels with thumbnails + download
3. **Image to GRAB** - Upload image -> convert to colored cube level
4. **Modded Colors** - Color picker outputting protobuf color values
5. **Level Stats** - View play count, difficulty, likes for any level
6. **User Lookup** - Search users, see all their levels
7. **Level Editor** - Upload .level -> edit as JSON -> re-export
8. **Level Merger** - Combine multiple .level files into one

## Tech
- Static HTML/CSS/JS (no framework)
- protobuf.js for client-side .level encoding/decoding
- Canvas API for image processing
- GitHub Pages deployment

## File Structure
```
PolarsTools/
├── index.html
├── css/style.css
├── js/{proto,api,downloader,browser,image2grab,colors,stats,userlookup,editor,merger}.js
├── proto/level.proto
├── pages/{downloader,browser,image2grab,colors,stats,userlookup,editor,merger}.html
└── img/
```
