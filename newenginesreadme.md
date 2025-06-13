# Adding New Search Engines to Search by Image Extension

This guide explains the complete process for adding a new search engine to the Search by Image browser extension, based on the implementation of the Hive search engine.

## Overview

Adding a new search engine involves 6 main steps:
1. **Engine Implementation** - Create the search logic
2. **Configuration** - Add engine to data configuration
3. **Localization** - Add engine names for UI
4. **Storage Migration** - Add engine to existing installations
5. **Assets** - Add engine icon
6. **Testing** - Build and test the implementation

## Step 1: Engine Implementation

### 1.1 Create Engine File
Create `src/engines/{enginename}.js` with the basic structure:

```javascript
import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt, prepareImageForUpload} from 'utils/engines';

const engine = 'enginename';

async function search({session, search, image, storageIds}) {
  await sendReceipt(storageIds);

  if (search.assetType === 'image') {
    // Handle blob/file upload
    // Implementation depends on the target site's file input
  } else {
    // Handle URL-based search  
    // Implementation depends on the target site's URL structure
  }
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}
```

### 1.2 Implementation Patterns

#### For File Upload Engines:
```javascript
async function search({session, search, image, storageIds}) {
  await sendReceipt(storageIds);

  // Let prepareImageForUpload handle format conversion automatically
  const preparedImage = await prepareImageForUpload({
    image,
    engine
  });

  const fileInputSelector = 'input[type="file"]'; // Adjust selector as needed
  const fileInput = await findNode(fileInputSelector, {timeout: 10000});
  
  await setFileInputData(fileInputSelector, fileInput, preparedImage);
  fileInput.dispatchEvent(new Event('change', {bubbles: true}));
}
```

#### For URL-based Engines:
```javascript
async function search({session, search, image, storageIds}) {
  await sendReceipt(storageIds);

  if (image.imageUrl) {
    const searchUrl = `https://example.com/search?url=${encodeURIComponent(image.imageUrl)}`;
    window.location.href = searchUrl;
  }
}
```

#### For Hybrid Engines (Hive Pattern):
```javascript
function isProblematicUrl(url) {
  // Define URL patterns that cause issues
  return url.includes('fbcdn.net') || 
         url.includes('?') && url.split('?')[1].length > 50;
}

async function search({session, search, image, storageIds}) {
  await sendReceipt(storageIds);

  const shouldUseFileUpload = search.assetType === 'image' || 
                             (image.imageUrl && isProblematicUrl(image.imageUrl));

  if (shouldUseFileUpload) {
    // Use file upload for reliability
  } else {
    // Use URL-based search for simple URLs
  }
}
```

## Step 2: Configuration in data.js

### 2.1 Add Engine to Main Configuration
Edit `src/utils/data.js` and add your engine to the `engines` object:

```javascript
const engines = {
  // ... existing engines ...
  enginename: {
    url: {
      target: 'https://example.com/search?url={imgUrl}'
    },
    image: {
      target: 'https://example.com/',
      isExec: true
    }
  },
  // ... rest of engines ...
};
```

**Configuration Options:**
- `url.target`: URL pattern for URL-based searches (`{imgUrl}` placeholder)
- `image.target`: Base URL for file upload searches
- `image.isExec: true`: Indicates this engine requires script execution

### 2.2 Add Format Support
Add your engine to relevant format support arrays **only if the engine natively supports these formats**:

```javascript
// For WebP support - only add if engine natively supports WebP
const webpEngineSupport = [
  // ... existing engines ...
  'enginename' // Only if engine accepts WebP uploads directly
];

// For AVIF support - only add if engine natively supports AVIF
const avifEngineSupport = [
  // ... existing engines ...
  'enginename' // Only if engine accepts AVIF uploads directly
];

// For GIF support - only add if engine supports animated images
const gifEngineSupport = [
  // ... existing engines ...
  'enginename' // Only if engine accepts GIF uploads directly
];
```

**Important**: If your engine doesn't natively support these formats, **don't add it to these arrays**. The `prepareImageForUpload` function will automatically convert unsupported formats when needed.

### 2.3 Add Upload Size Limits
```javascript
const maxImageUploadSize = {
  // ... existing engines ...
  enginename: {ui: 10 * 1024 * 1024} // 10MB limit example
};
```

### 2.4 Add Icon Configuration
For PNG icons (most common):
```javascript
const rasterEngineIcons = ['iqdb', 'tineye', 'whatanime', 'repostSleuth', 'enginename'];
```

For dark theme variants:
```javascript
const engineIconVariants = {
  // ... existing engines ...
  enginename: ['dark']
};
```

## Step 3: Localization

### 3.1 Add Engine Names
Edit `src/assets/locales/en/messages.json` and add three entries:

```json
{
  "engineName_enginename": {
    "message": "Engine Display Name",
    "description": "Name of the search engine."
  },
  
  "menuItemTitle_enginename": {
    "message": "Engine Display Name",
    "description": "Title of the menu item."
  },
  
  "optionTitle_enginename": {
    "message": "Engine Display Name or Full Description",
    "description": "Title of the option."
  }
}
```

**Example (Hive):**
```json
{
  "engineName_hive": {
    "message": "Hive",
    "description": "Name of the search engine."
  },
  
  "menuItemTitle_hive": {
    "message": "Hive", 
    "description": "Title of the menu item."
  },
  
  "optionTitle_hive": {
    "message": "Hive",
    "description": "Title of the option."
  }
}
```

## Step 4: Storage Migration

### 4.1 Create Migration File
Create `src/storage/revisions/local/YYYYMMDDHHMMSS_add_enginename.js`:

```javascript
const message = 'Add Engine Name';

const revision = 'YYYYMMDDHHMMSS_add_enginename';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngine = 'enginename';

  const enabledEngineCount = engines.length - disabledEngines.length;

  // Add engine after a similar engine or at a logical position
  const similarEngineIndex = engines.indexOf('similarengine');
  if (similarEngineIndex !== -1) {
    engines.splice(similarEngineIndex + 1, 0, newEngine);
  } else {
    engines.push(newEngine); // Fallback: add at end
  }
  changes.engines = engines;

  // Disable by default if user has too many engines enabled
  if (enabledEngineCount >= 8) {
    disabledEngines.push(newEngine);
  }
  changes.disabledEngines = disabledEngines;

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
```

### 4.2 Register Migration
Edit `src/storage/config.json` and add the migration to the local revisions array:

```json
{
  "revisions": {
    "local": [
      // ... existing revisions ...
      "YYYYMMDDHHMMSS_add_enginename"
    ]
  }
}
```

## Step 5: Assets

### 5.1 Engine Icon
Add icon to `src/assets/icons/engines/`:

**For PNG icons:**
- Download official icon/logo
- Save as `enginename.png` 
- Size should be reasonable (64x64 to 512x512 pixels)
- The build process will auto-generate required sizes

**For SVG icons:**
- Save as `enginename.svg`
- Ensure it uses `currentColor` for theme compatibility

### 5.2 Icon Sources
Good sources for official icons:
- Engine's website favicon
- Engine's press kit/brand assets
- App store listings (like Google Play Store)
- Social media profile images

## Step 6: Testing

### 6.1 Build Extension
```bash
# Install dependencies (if not done)
npm install --legacy-peer-deps

# Build for Firefox
npm run build:firefox

# Build for Chrome  
npm run build:chrome
```

### 6.2 Load in Browser

**Firefox:**
1. Go to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `dist/firefox/manifest.json`

**Chrome:**
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `dist/chrome/` folder

### 6.3 Test Scenarios
Test the following scenarios:
- [ ] Right-click on simple web images
- [ ] Right-click on Facebook/social media images
- [ ] Upload images from device
- [ ] Capture screenshot areas
- [ ] Paste images from clipboard
- [ ] Different image formats (JPEG, PNG, WebP, AVIF)
- [ ] Large images (test size limits)
- [ ] Engine appears in options with correct name
- [ ] Engine appears in context menu with correct name

## Troubleshooting Common Issues

### Engine Name Not Showing
- Check that all three localization entries are added correctly
- Ensure there are no JSON syntax errors
- Rebuild the extension after adding localization

### File Upload Not Working
- Verify the file input selector is correct
- Check if the site requires specific event dispatching
- Some sites may need additional form field population

### URL Search Failing
- Check if the URL pattern is correct
- Some sites may have CORS restrictions
- Consider using file upload as fallback for problematic URLs

### Icon Not Appearing  
- Ensure icon file is in correct directory
- Check that icon is added to `rasterEngineIcons` if using PNG
- Verify build process includes the icon

### Migration Not Working
- Ensure migration file exports are correct
- Check that migration is added to config.json
- Verify timestamp format in filename

## Advanced Patterns

### Image Format Optimization

The extension has intelligent format conversion built-in that optimizes performance and compatibility. Understanding when and how to use these features is crucial for optimal engine implementation.

#### Automatic Format Conversion (Recommended)

```javascript
// ✅ RECOMMENDED: Let the extension handle conversion automatically
const preparedImage = await prepareImageForUpload({
  image,
  engine
});
```

**When to use:**
- ✅ **Most engines** - Default approach for 95% of implementations
- ✅ **Engines with limited format support** (like Hive - only supports JPG, PNG, WebP)
- ✅ **Unknown or undocumented format support** - Safe default behavior
- ✅ **Engines with size limits** - Automatic optimization for large images

**How it works:**
1. **Format Detection**: Checks if engine natively supports the image format
2. **Size Analysis**: Evaluates if image exceeds engine's size limits
3. **Smart Conversion**: Only converts when necessary (unsupported format OR size limit exceeded)
4. **Format Preservation**: Compatible formats upload directly without unnecessary conversion

#### Manual Format Conversion (Special Cases)

```javascript
// ⚠️ CONDITIONAL: Force conversion only when engine has specific requirements
const preparedImage = await prepareImageForUpload({
  image,
  engine,
  newType: 'image/jpeg' // Use sparingly
});
```

**When to use:**
- ⚠️ **Documented format requirements** - Engine explicitly requires specific format
- ⚠️ **API constraints** - REST APIs that only accept certain MIME types
- ⚠️ **Legacy engines** - Older services with strict format validation
- ⚠️ **Quality optimization** - When JPEG compression is specifically needed

**Examples of when forced conversion might be necessary:**
```javascript
// Engine that ONLY accepts JPEG (rare)
const preparedImage = await prepareImageForUpload({
  image,
  engine,
  newType: 'image/jpeg'
});

// API with strict MIME type validation
const preparedImage = await prepareImageForUpload({
  image,
  engine,
  newType: 'image/png' // API only accepts PNG
});
```

#### Format Support Array Configuration

**❌ AVOID: Don't add engines to format arrays unless they natively support the format**

```javascript
// Wrong - adds Hive even though it doesn't support AVIF/WebP natively
const avifEngineSupport = [
  'bing', 'yandex', 'hive' // ❌ Hive doesn't natively support AVIF
];
```

**✅ CORRECT: Only add engines that natively accept the format**

```javascript
// Correct - only engines that accept AVIF uploads directly
const avifEngineSupport = [
  'bing',     // ✅ Bing accepts AVIF uploads
  'yandex',   // ✅ Yandex accepts AVIF uploads
  // 'hive'   // ❌ Removed - Hive doesn't accept AVIF
];
```

#### Decision Matrix for Format Handling

| Engine Scenario | Format Arrays | prepareImageForUpload | Reasoning |
|-----------------|---------------|----------------------|-----------|
| **Modern engine (Google, Bing)** | Add to webp/avif arrays | `{image, engine}` | Native support = faster uploads |
| **Limited engine (Hive, TinEye)** | Don't add to arrays | `{image, engine}` | Let extension handle conversion |
| **JPEG-only engine** | Don't add to arrays | `{image, engine, newType: 'image/jpeg'}` | Force JPEG for compatibility |
| **PNG-only API** | Don't add to arrays | `{image, engine, newType: 'image/png'}` | API requirement |
| **Unknown support** | Don't add to arrays | `{image, engine}` | Safe default approach |

#### Performance Impact Analysis

**Automatic Conversion (Recommended):**
- ✅ **Optimal performance** - No unnecessary conversions
- ✅ **Format preservation** - JPEG stays JPEG, PNG stays PNG
- ✅ **Smart optimization** - Only converts when needed
- ✅ **Size efficiency** - Respects original compression

**Manual Conversion (newType specified):**
- ⚠️ **Always converts** - Even when original format would work
- ⚠️ **Quality loss** - Potential compression artifacts
- ⚠️ **Larger files** - May increase upload size unnecessarily
- ⚠️ **Processing overhead** - Additional conversion step

#### Real-World Examples

**Example 1: Hive Engine (Limited Format Support)**
```javascript
// ✅ OPTIMAL: Let extension handle AVIF→JPEG conversion automatically
const preparedImage = await prepareImageForUpload({
  image,
  engine // Extension detects Hive doesn't support AVIF and converts
});

// ❌ SUBOPTIMAL: Forces all images to JPEG
const preparedImage = await prepareImageForUpload({
  image,
  engine,
  newType: 'image/jpeg' // Converts even PNG/JPEG unnecessarily
});
```

**Example 2: Google Images (Full Format Support)**
```javascript
// ✅ OPTIMAL: No conversion needed for most formats
const preparedImage = await prepareImageForUpload({
  image,
  engine // Google accepts AVIF, WebP, JPEG, PNG directly
});
```

**Example 3: Legacy API (JPEG Only)**
```javascript
// ✅ NECESSARY: API requirement forces conversion
const preparedImage = await prepareImageForUpload({
  image,
  engine,
  newType: 'image/jpeg' // Required by API specification
});
```

#### Testing Format Optimization

When testing your engine implementation:

1. **Test with different formats**: JPEG, PNG, WebP, AVIF, GIF
2. **Verify no unnecessary conversions**: Check browser dev tools for actual uploaded format
3. **Test size limits**: Upload large images to verify size optimization
4. **Monitor performance**: Measure upload times with different approaches

The goal is to minimize conversions while ensuring compatibility.

### Custom Form Handling
Some engines may require additional form fields:

```javascript
async function search({session, search, image, storageIds}) {
  // Fill additional form fields
  const additionalInput = await findNode('input[name="additional"]');
  additionalInput.value = 'some_value';
  
  // Handle file input
  const fileInput = await findNode('input[type="file"]');
  await setFileInputData('input[type="file"]', fileInput, image);
  
  // Submit form
  const form = await findNode('form');
  form.submit();
}
```

### API-based Engines
For engines with APIs (like Pinterest pattern):

```javascript
async function search({session, search, image, storageIds}) {
  const data = new FormData();
  data.append('image', image.imageBlob, image.imageFilename);
  
  const response = await fetch('https://api.example.com/search', {
    method: 'POST',
    body: data
  });
  
  const result = await response.json();
  // Handle result...
}
```

### Error Handling
Always include proper error handling:

```javascript
async function search({session, search, image, storageIds}) {
  try {
    await sendReceipt(storageIds);
    // ... search implementation
  } catch (err) {
    console.error(`${engine}: Error during search:`, err);
    throw err; // Re-throw to trigger extension error handling
  }
}
```

## Real-World Implementation Examples

### Example 1: Hive Engine (Hybrid Approach)

The Hive engine implementation demonstrates several patterns:

1. **Hybrid URL/File approach** - Uses file upload for problematic URLs
2. **Format conversion** - Converts unsupported formats to JPEG
3. **Smart URL detection** - Identifies complex URLs that need special handling
4. **Proper error handling** - Graceful fallbacks and error logging

This makes it a good reference for implementing robust search engines that work across different scenarios.

### Example 2: CopySeeker Engine (File Upload Focus)

The CopySeeker implementation teaches us about file-upload focused engines:

1. **Simplified Interface** - Pure file upload without URL complexity
2. **Strategic Placement** - Positioned after similar engines (Hive) for better UX
3. **Icon Integration** - Official App Store icons work seamlessly with build system
4. **Plagiarism Detection** - Specialized use case for copyright/plagiarism detection

## Implementation Lessons Learned

### Configuration File Variations
**Important Discovery**: Different forks may have evolved migration naming conventions.

```javascript
// Some forks use descriptive names:
"20140717162040_add_tineye"

// Others use shortened IDs:
"ryekyizAg"
```

**Lesson**: Always check `src/storage/config.json` structure before assuming format.

### Build System Intelligence
**Discovery**: The build system automatically handles asset processing.

**What Happens Automatically**:
- Icon optimization and resizing
- Asset counting and bundle creation
- Cross-browser compatibility adjustments
- Format conversion preparation

**Evidence**:
- Engine assets increased from 46 to 47 (visible in build output)
- Total size increase: ~9KB for new engine + icon
- Different output sizes for Chrome vs Firefox builds

### Migration Placement Strategy
**Best Practice**: Group similar engines together for better user experience.

```javascript
// ✅ GOOD: Place similar engines together
const hiveIndex = engines.indexOf('hive'); // Find similar engine
if (hiveIndex !== -1) {
  engines.splice(hiveIndex + 1, 0, newEngine); // Place after it
}

// ❌ LESS OPTIMAL: Always append to end
engines.push(newEngine);
```

**Reasoning**: Users discover related functionality more easily when engines are logically grouped.

### Format Support Array Insights
**Critical Learning**: Trust the framework's intelligence over manual overrides.

**Key Insight**: The `prepareImageForUpload` function is more sophisticated than initially apparent:
- Only converts when truly necessary
- Considers both format compatibility AND size limits
- Preserves original quality when possible
- Handles edge cases automatically

**Implication**: Don't add engines to format support arrays unless they **genuinely** accept those formats natively.

### Cross-Browser Build Differences
**Observation**: Builds produce slightly different outputs per browser.

**Firefox Build**:
```
assets by path engines/ 418 KiB 47 assets
modules by path ./src/ 401 KiB (javascript)
```

**Chrome Build**:
```
assets by path engines/ 418 KiB 47 assets
modules by path ./src/ 398 KiB (javascript)
```

**Lesson**: Always test both builds to ensure compatibility across browsers.

### Error Handling Evolution
**Pattern**: Start simple, add sophistication as needed.

```javascript
// ✅ PRODUCTION READY: Comprehensive error handling
if (fileInput) {
  await setFileInputData(fileInputSelector, fileInput, preparedImage);
  fileInput.dispatchEvent(new Event('change', {bubbles: true}));
} else {
  console.error('CopySeeker: No file input found for image upload');
}
```

**Learning**: Include clear error messages for debugging, but don't over-engineer initially.

## Common Implementation Gotchas

### 1. Config File Structure Assumptions
**Problem**: Assuming migration format without checking.
**Solution**: Always read `config.json` first to understand the structure.

### 2. Format Array Over-inclusion
**Problem**: Adding engines to format support arrays when they don't natively support formats.
**Solution**: Only include engines that genuinely accept the format directly.

### 3. Icon Asset Management
**Problem**: Manual icon processing or incorrect sizing.
**Solution**: Let the build system handle optimization automatically.

### 4. Migration Ordering Logic
**Problem**: Random placement of new engines in user interface.
**Solution**: Strategic placement near similar engines for better UX.

### 5. Build Verification Shortcuts
**Problem**: Only testing one browser build.
**Solution**: Always build and verify both Firefox and Chrome outputs.

## Implementation Checklist

Based on real-world experience, use this checklist:

### Pre-Implementation
- [ ] Analyze target site interface (file upload vs URL-based)
- [ ] Check `config.json` format in your specific fork
- [ ] Identify similar engines for strategic placement
- [ ] Source official icon from reliable location

### During Implementation
- [ ] Use automatic format conversion (`{image, engine}`) unless specifically required
- [ ] Include comprehensive error handling with clear messages
- [ ] Place engine logically in migration (near similar engines)
- [ ] Test with various image formats and sizes

### Post-Implementation
- [ ] Build for both Firefox AND Chrome
- [ ] Verify asset count increased in build output
- [ ] Test engine appears correctly in UI
- [ ] Confirm migration works on clean install
- [ ] Document any unique patterns discovered

This checklist helps avoid common pitfalls discovered during real implementations.

## Conclusion

Adding a new search engine requires touching multiple parts of the codebase, but following this systematic approach ensures a complete and robust implementation. The key is to:

1. Understand the target site's interface (file upload vs URL-based)
2. Handle both search modes appropriately
3. Include proper format conversion and error handling
4. Test thoroughly across different browsers and image sources
5. Ensure proper localization for a good user experience

For complex engines, start with a basic implementation and iteratively improve based on testing feedback.