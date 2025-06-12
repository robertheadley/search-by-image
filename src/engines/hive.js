import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt, prepareImageForUpload} from 'utils/engines';

const engine = 'hive';

function isProblematicUrl(url) {
  // Check for URLs that typically cause issues with Hive
  return url.includes('fbcdn.net') || // Facebook URLs
         url.includes('scontent') || // Facebook content URLs
         url.includes('instagram.com') || // Instagram URLs
         url.includes('?') && url.split('?')[1].length > 50; // URLs with many parameters
}

async function search({session, search, image, storageIds}) {
  await sendReceipt(storageIds);

  // Always prefer file upload for more reliable results, especially for problematic URLs
  const shouldUseFileUpload = search.assetType === 'image' ||
                             (image.imageUrl && isProblematicUrl(image.imageUrl));

  if (shouldUseFileUpload) {
    // Handle blob/file upload with format conversion
    try {
      // Ensure image is in a compatible format (JPG, PNG, WebP)
      // Hive doesn't support AVIF and other modern formats
      const preparedImage = await prepareImageForUpload({
        image,
        engine,
        newType: 'image/jpeg' // Convert to JPEG if format is unsupported
      });

      const fileInputSelector = 'input[type="file"]';
      const fileInput = await findNode(fileInputSelector, {timeout: 10000, throwError: false});
      
      if (fileInput) {
        await setFileInputData(fileInputSelector, fileInput, preparedImage);
        fileInput.dispatchEvent(new Event('change', {bubbles: true}));
      } else {
        console.error('Hive: No file input found for image upload');
      }
    } catch (err) {
      console.error('Hive: Error preparing image for upload:', err);
      throw err;
    }
  } else {
    // Handle URL-based search only for simple, clean URLs
    if (image.imageUrl) {
      const analyzeUrl = `https://bizarrus.github.io/Hive/#analyze/${encodeURIComponent(image.imageUrl)}`;
      window.location.href = analyzeUrl;
    } else {
      console.error('Hive: No image URL available for URL-based search');
    }
  }
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}