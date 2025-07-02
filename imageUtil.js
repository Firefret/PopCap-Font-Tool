/**
 * Removes pure black pixels from an image and makes them transparent
 * @param {File} imageFile - The image file to process
 * @returns {Promise<string>} - URL of the processed image
 */
export async function removeBlack(imageFile) {
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
}

export async function mergeFontImages(images) {
    try {
        // Sort images so that Outline images come first (will be rendered at the bottom)
        const sortedImages = [...images].sort((a, b) => {
            const aIsOutline = a.name.endsWith('Outline.png');
            const bIsOutline = b.name.endsWith('Outline.png');
            if (aIsOutline && !bIsOutline) return -1;
            if (!aIsOutline && bIsOutline) return 1;
            return 0;
        });

        // Get dimensions from the first image
        const firstImage = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = URL.createObjectURL(sortedImages[0]);
        });

        // Create canvas with dimensions from the first image
        const canvas = document.createElement('canvas');
        canvas.width = firstImage.width;
        canvas.height = firstImage.height;
        const ctx = canvas.getContext('2d');

        // Release the URL object
        URL.revokeObjectURL(firstImage.src);

        // Process and draw each image on the canvas
        for (const image of sortedImages) {
            const img = new Image();

            // Create a promise for each image loading
            await new Promise((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error(`Failed to load image: ${image.name}`));

                // Check if image needs black removal
                if (image.name.startsWith('_')) {
                    // Use removeBlack for images starting with underscore
                    removeBlack(image).then(processedUrl => {
                        img.src = processedUrl;
                    }).catch(reject);
                } else {
                    img.src = URL.createObjectURL(image);
                }
            });

            // Draw the image on the canvas
            ctx.drawImage(img, 0, 0);

            // Release the URL object
            if (!image.name.startsWith('_')) {
                URL.revokeObjectURL(img.src);
            }
        }

        // Convert canvas to blob
        return new Promise((resolve) => {
            canvas.toBlob(blob => {
                resolve(blob);
            }, 'image/png');
        });
    } catch (error) {
        console.error("Error merging images:", error);
        throw error;
    }
}

export async function cutImageBlobToPieces(originalImageBlob, cutRects) {
    if (!(originalImageBlob instanceof Blob)) {
        throw new TypeError("The 'originalImageBlob' argument must be a Blob.");
    }
    if (!Array.isArray(cutRects)) {
        throw new TypeError("The 'cutRects' argument must be an array.");
    }

    return new Promise((resolve, reject) => {
        const img = new Image(); // Create a new Image element

        // 1. Handle successful image loading
        img.onload = async () => {
            const promises = cutRects.map(charObject => {
                // Ensure charObject has a rect property and it's an array of 4 numbers
                if (!charObject.rect || !Array.isArray(charObject.rect) || charObject.rect.length !== 4) {
                    console.warn("Skipping charObject due to invalid 'rect' property:", charObject);
                    return Promise.resolve(charObject); // Resolve with original object if rect is invalid
                }

                const [x, y, width, height] = charObject.rect;

                // Create a temporary canvas for cutting each piece
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                // Draw the specific section of the loaded image onto the temporary canvas
                ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

                // Convert the canvas content to a new Blob
                return new Promise(blobResolve => {
                    canvas.toBlob(blob => {
                        charObject.charImage = blob; // Assign the new Blob to charImage
                        blobResolve(charObject); // Resolve this individual promise with the updated object
                    }, 'image/png'); // Specify the output format, 'image/png' is generally good
                });
            });

            try {
                // Wait for all individual character image blobs to be created
                await Promise.all(promises);
                resolve(cutRects); // Resolve the main promise with the updated fontData.characters array
            } catch (error) {
                reject(new Error("Error during character image processing: " + error.message));
            }
        };

        // 2. Handle image loading errors
        img.onerror = (errorEvent) => {
            reject(new Error(`Failed to load original image Blob: ${errorEvent.message || 'Unknown error'}`));
        };

        // 3. Set the image source to the Object URL of the original Blob
        // This starts the asynchronous loading process
        img.src = URL.createObjectURL(originalImageBlob);
    });

}