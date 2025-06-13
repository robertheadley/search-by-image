import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt, prepareImageForUpload} from 'utils/engines';

const engine = 'copyseeker';

async function search({session, search, image, storageIds}) {
  await sendReceipt(storageIds);

  if (search.assetType === 'image') {
    // Handle blob/file upload with automatic format conversion
    try {
      // Let prepareImageForUpload handle format conversion automatically
      const preparedImage = await prepareImageForUpload({
        image,
        engine
      });

      // Look for file input on CopySeeker page
      const fileInputSelector = 'input[type="file"]';
      const fileInput = await findNode(fileInputSelector, {timeout: 10000, throwError: false});
      
      if (fileInput) {
        await setFileInputData(fileInputSelector, fileInput, preparedImage);
        fileInput.dispatchEvent(new Event('change', {bubbles: true}));
      } else {
        console.error('CopySeeker: No file input found for image upload');
      }
    } catch (err) {
      console.error('CopySeeker: Error preparing image for upload:', err);
      throw err;
    }
  } else {
    // CopySeeker is primarily file upload based, but redirect to main page for URL searches
    if (image.imageUrl) {
      // Redirect to CopySeeker homepage where user can upload the image manually
      window.location.href = 'https://copyseeker.net/';
    } else {
      console.error('CopySeeker: No image available for search');
    }
  }
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}