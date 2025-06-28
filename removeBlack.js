/**
 * Removes pure black pixels from an image and makes them transparent
 * @param {File} imageFile - The image file to process
 * @returns {Promise<string>} - URL of the processed image
 */
export const removeBlack = async (imageFile) => {
    return new Promise((resolve, reject) => {
        try {
            // Create Image object
            const img = new Image();
            img.src = URL.createObjectURL(imageFile);

            img.onload = () => {
                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');

                // Draw image on canvas
                ctx.drawImage(img, 0, 0);

                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Process pixels
                for (let i = 0; i < data.length; i += 4) {
                    const red = data[i];
                    const green = data[i + 1];
                    const blue = data[i + 2];

                    // If pixel is pure black, make it transparent
                    if (red === 0 && green === 0 && blue === 0) {
                        data[i + 3] = 0; // Set alpha to 0
                    }
                }

                // Put processed data back on canvas
                ctx.putImageData(imageData, 0, 0);

                // Convert canvas to blob
                canvas.toBlob((blob) => {
                    // Clean up the object URL
                    URL.revokeObjectURL(img.src);
                    
                    // Create and return new URL for processed image
                    const processedImageUrl = URL.createObjectURL(blob);
                    resolve(processedImageUrl);
                }, 'image/png');
            };

            img.onerror = (error) => {
                URL.revokeObjectURL(img.src);
                reject(error);
            };

        } catch (error) {
            reject(error);
        }
    });
};