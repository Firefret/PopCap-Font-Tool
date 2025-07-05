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

                // --- Start of improved pixel processing ---
                // Adjustable parameters for black removal
                const blacknessThreshold = 0; // Pixels with R, G, B components below this are considered "blackish"
                // Adjust this value (0-255) to control sensitivity.
                // Lower values target darker blacks; higher values affect more greys.

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const originalAlpha = data[i + 3]; // Store original alpha

                    // Calculate the "maximum" color component for this pixel
                    // A lower `maxComponent` indicates a darker pixel.
                    const maxComponent = Math.max(r, g, b);

                    // Calculate how "black" the pixel is.
                    // A value of 255 means pure black, 0 means no black (pure white/full color).
                    const blackness = 255 - maxComponent;

                    // If the pixel is considered "blackish" based on our threshold
                    if (blackness > blacknessThreshold) {
                        // Calculate a transparency factor.
                        // We want pixels closer to pure black (blackness = 255) to be fully transparent (alpha = 0).
                        // Pixels at the `blacknessThreshold` should retain more of their original alpha.
                        // We'll normalize `blackness` relative to the threshold and 255.
                        let transparencyFactor;
                        if (blackness >= 255) { // Pure black
                            transparencyFactor = 0;
                        } else {
                            // Linearly interpolate transparency.
                            // If blackness is `blacknessThreshold`, factor is 1 (fully opaque based on this part of logic).
                            // If blackness is 255, factor is 0 (fully transparent).
                            transparencyFactor = 1 - ((blackness - blacknessThreshold) / (255 - blacknessThreshold));
                            if (transparencyFactor < 0) transparencyFactor = 0; // Ensure it doesn't go negative
                        }

                        // Apply the new transparency while also considering the original alpha
                        data[i + 3] = originalAlpha * transparencyFactor;

                        // --- Attempt to remove black tint (the "Photoshop-style" part) ---
                        // This is the tricky part. If we've made the pixel more transparent
                        // because it was dark, we want to "lighten" its remaining color
                        // so it doesn't look like a dark, semi-transparent smudge.

                        // The idea is to blend the original color with white,
                        // proportional to how much transparency we just added due to blackness.
                        const newAlpha = data[i + 3];
                        if (newAlpha < originalAlpha) { // Only if we made it more transparent
                            // Calculate the ratio of transparency added (how much "black" we removed from the pixel's visibility)
                            const alphaReductionRatio = (originalAlpha - newAlpha) / originalAlpha;

                            // Blend R, G, B towards white (255) based on this ratio.
                            // This effectively lifts the dark values.
                            data[i] = r + (255 - r) * alphaReductionRatio;
                            data[i + 1] = g + (255 - g) * alphaReductionRatio;
                            data[i + 2] = b + (255 - b) * alphaReductionRatio;
                        }
                    }
                }
                // --- End of improved pixel processing ---

                // Put processed data back on canvas
                ctx.putImageData(imageData, 0, 0);

                // Convert canvas to blob
                canvas.toBlob((blob) => {
                    // Clean up the object URL
                    URL.revokeObjectURL(img.src);

                    // Create and return new URL for processed image
                    const processedImageUrl = URL.createObjectURL(blob);
                    resolve(processedImageUrl);
                }, 'image/png'); // Using 'image/png' is important for preserving transparency

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