

import drawTable from './tableBuilder.js';
import * as windows1251 from './windows-1251.js';
import * as imageUtil from './imageUtil.js';


const FILEINPUT = document.getElementById("fontdata");
const FINEINPUTLABEL = document.getElementById("fontdatalabel");
const FILESLIST = document.getElementById("fileslist");
const UPLOADFILES = document.getElementById("uploadfiles");

let fontInstance;

let fontFiles = [];

class Font {
    constructor(text, images) {
        window.fontInstance = this;
        this.appendix = "";
        this.text = text;
        this.images = images;
        this.mergedFont = null; // Will be set after merging
        this.fontData = null;   // Will be set after parsing
        this.charURLs = [];
        this.isMagnified = false; // New property to track magnification state
        this.magnifiedOverlay = null; // New property to hold the magnification overlay

        // Main asynchronous initialization sequence
        this.initializeFont();

        this.downloadButton = document.createElement('button');
        this.downloadButton.textContent = "Save file";
        this.downloadButton.id = "downloadButton";

        this.downloadButton.onclick = () => {
            this.downloadSerializedFontFile(this.text.name);
        };
        UPLOADFILES.appendChild(this.downloadButton);
        UPLOADFILES.style.position = "sticky";
        UPLOADFILES.style.top = "5px";
        UPLOADFILES.style.overflow = "auto";
        //PopCap Font Tool by Firefret
    }

    async initializeFont() {
        // 1. Merge images (async)
        this.mergedFont = await imageUtil.mergeFontImages(this.images);
        console.log("Merged font image available.");
        this.fontPreviewArea = this.createFontPreview(); // Now this will have mergedFont available
        // 2. Parse font data (async)
        this.fontData = await this.parseFontTxt(this.text);
        console.dir(this.fontData);
        drawTable(this.fontData); // Draw tables after font data is available

        // 3. Cut font to chars using the MERGED font (async)
        // Ensure fontData is passed correctly (it should be an array of characters with rects)
        if (this.fontData && this.fontData.characters) {
            await imageUtil.cutImageBlobToPieces(this.mergedFont, this.fontData.characters);
            console.log("Characters cut into individual blobs.");
        } else {
            console.warn("Font data or characters array not found, skipping character cutting.");
        }

    }
    async fontRenderer(previewArea){
        if(fontInstance.charURLs.length > 0){
            while(fontInstance.charURLs[0]){
                URL.revokeObjectURL(fontInstance.charURLs[0]);
                fontInstance.charURLs.shift();

            }
        }
        await imageUtil.cutImageBlobToPieces(this.mergedFont, this.fontData.characters)
        previewArea.innerHTML = '';
        let inputField = document.getElementById('livePreviewInput');
        let inputArray = inputField.value.split('');
        let zValue = 0;
        let widthAccumulator = 0
        inputArray.forEach((char, index) => {
            let img = document.createElement('img');
            let charInstance = fontInstance.fontData.characters.find(charObj => charObj.character === char);

            if(char === " "){ //If the char is a space
                let spaceDiv = document.createElement('div');
                spaceDiv.style.width = `${fontInstance.spaceValue}px`;
                spaceDiv.style.height = `${fontInstance.fontData.characters[0].rect[3]}px`;
                spaceDiv.style.display = 'inline-block';
                spaceDiv.style.position = 'relative';
                previewArea.appendChild(spaceDiv);
                let previousChar = spaceDiv.previousElementSibling;
                if(previousChar instanceof HTMLDivElement){ //And if the previous one is also a space
                    spaceDiv.style.left = previousChar.style.left;
                } else {
                    spaceDiv.style.left = `-${widthAccumulator}px`;
                    widthAccumulator += fontInstance.spaceValue;
                }
            }
            else{
                let url = URL.createObjectURL(charInstance.charImage);
                img.src = url;
                fontInstance.charURLs.push(url)
                img.style.position = 'relative';
                img.dataset.nextcharmoveleft = charInstance.rect[2] - charInstance.width;
                img.style.zIndex = zValue++;

                previewArea.appendChild(img);
                let previousChar = img.previousElementSibling;
                if(!previousChar){//If the character is the first one
                    img.style.left = `${charInstance.offset[0]+(charInstance.rect[2] - charInstance.width)}px`;
                }
                if(previousChar instanceof HTMLImageElement){ //If there's a character before

                    //Handle kerning
                    //Find if this one and the previous one form an existent kerning pair
                    let charPair = `${inputArray[index - 1]}${char}`;
                    if (fontInstance.fontData.kerning && charPair in fontInstance.fontData.kerning) {
                        const kerningValue = fontInstance.fontData.kerning[charPair];
                        console.log(`${charPair}: ${kerningValue}`);
                        widthAccumulator -= kerningValue; // <-- minus instead of plus
                    }
                    img.style.left = `${(widthAccumulator - charInstance.offset[0]) * (-1)}px`;
                    widthAccumulator += ((charInstance.rect[2]  - charInstance.width));

                }
                else if(previousChar instanceof HTMLDivElement){ //If there's a space before
                    img.style.left = `-${widthAccumulator - charInstance.offset[0]-fontInstance.spaceValue}px`;
                    widthAccumulator += ((charInstance.rect[2]  - charInstance.width)-fontInstance.spaceValue);
                }
            }
        })
        // If magnification is active, update the magnified view as well
        if (this.isMagnified) {
            this.magnifyLivePreview(previewArea);
        }
    }
    createFontPreview() {
        let fontPreviewArea;
        // Remove previous image preview if it exists
        const existingPreview = document.getElementById('imageWindow');
        if (existingPreview) {
            // Clean up any object URLs to prevent memory leaks
            const images = existingPreview.querySelectorAll('img');
            Array.from(images).forEach(img => {
                URL.revokeObjectURL(img.src);
            });
            existingPreview.remove();
        }

        const scrollDiv = document.createElement('div');
        scrollDiv.id = "imageWindow";
        scrollDiv.style.cssText = `
    height: 100px;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
    background-color: lightgrey;
    border: 1px solid black;
    padding: 10px 0;
    display: inline-block;
`;

        // Create a container for overlapped images
        const imageContainer = document.createElement('div');
        imageContainer.style.cssText = `
    position: relative;
    height: 100%;
    display: inline-block;
`;

        // No need to wait for mergedFont - we know it's ready because
        // createFontPreview is only called after mergeFontImages resolves

        const img = document.createElement('img');
        console.log(this.mergedFont);

        if (this.mergedFont) {
            img.style.height = '100%'; // Make image fill container height
            img.src = URL.createObjectURL(this.mergedFont);
            imageContainer.appendChild(img);
            scrollDiv.appendChild(imageContainer);

            // Set container width based on the natural aspect ratio of images
            const firstImg = imageContainer.querySelector('img');
            firstImg.onload = () => {
                const aspectRatio = firstImg.naturalWidth / firstImg.naturalHeight;
                const containerHeight = scrollDiv.clientHeight - 20; // subtract padding
                const renderedWidth = containerHeight * aspectRatio;
                imageContainer.style.width = `${renderedWidth}px`;
                scrollDiv.style.width = `${Math.min(renderedWidth, 700)}px`;
            };

            // Get the upload element
            const uploadElement = document.getElementById('uploadfiles');
            const parent = uploadElement.parentElement;

            // Set up or reuse the top row container
            let topRow = document.getElementById('topRowContainer');

            if (!topRow) {
                topRow = document.createElement('div');
                topRow.id = 'topRowContainer';

                topRow.style.cssText = `
            display: flex;
            gap: 10px;
            align-items: start;
            margin-bottom: 20px;
        `;
                topRow.style.position = 'sticky';
                topRow.style.top = '10px';
                topRow.style.zIndex = '1000';
                parent.insertBefore(topRow, parent.firstChild);
                topRow.appendChild(uploadElement);
            }

            // Create a column for the previews to sit in
            let previewColumn = document.getElementById('previewColumn');
            if (!previewColumn) {
                previewColumn = document.createElement('div');
                previewColumn.id = 'previewColumn';
                previewColumn.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                `;
                topRow.appendChild(previewColumn);
            }

            // Add the image preview to the column
            previewColumn.appendChild(scrollDiv);

            // Make upload area twice the height of the preview
            uploadElement.style.height = `${scrollDiv.getBoundingClientRect().height * 2}px`;

            fontPreviewArea = this.createLivePreviewElement();

            // Cleanup object URLs on unload
            window.addEventListener('unload', () => {
                const images = imageContainer.getElementsByTagName('img');
                Array.from(images).forEach(img => {
                    URL.revokeObjectURL(img.src);
                });
            });
        }
        return fontPreviewArea;
    }

    createLivePreviewElement() {
        const LIVE_PREVIEW_WRAPPER_ID = 'livePreviewWrapper';
        // Remove previous live preview element if it exists
        const existingPreview = document.getElementById(LIVE_PREVIEW_WRAPPER_ID);
        if (existingPreview) {
            existingPreview.remove();
        }

        // Create the main wrapper div
        const livePreviewWrapper = document.createElement('div');
        livePreviewWrapper.id = LIVE_PREVIEW_WRAPPER_ID;

        // Try to match the width of the image preview
        const imagePreview = document.getElementById('imageWindow');
        const wrapperWidth = imagePreview ? imagePreview.style.width : 'auto';

        livePreviewWrapper.style.cssText = `
        display: flex;
        flex-direction: column;
        width: ${wrapperWidth};
        max-width: 700px;
    `;

        // Create the div that will show the rendered text (similar to scrollDiv)
        const livePreviewArea = document.createElement('div');
        livePreviewArea.id = 'livePreviewArea';
        livePreviewArea.style.cssText = `
        height: 100px;
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        background-color: lightgrey; /* Default background color */
        border: 1px solid black;
        padding: 10px 0;
        box-sizing: border-box;
        /* No position: relative needed here anymore for the button */
    `;

        // Create a container for the input field and buttons
        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = `
        display: flex; /* Use flexbox to align input and button horizontally */
        margin-top: 5px;
        width: 100%;
    `;

        // Create the input field
        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.id = 'livePreviewInput';
        inputField.placeholder = 'Type here for live preview...';
        inputField.style.cssText = `
        flex-grow: 1; /* Allow input to take up available space */
        padding: 5px;
        box-sizing: border-box;
        border: 1px solid black; /* Add border to match other elements */
        border-right: none; /* Remove right border to blend with button */
    `;

        inputField.addEventListener('input', () => {
            if (typeof fontInstance !== 'undefined' && fontInstance.fontRenderer) {
                fontInstance.fontRenderer(fontInstance.fontPreviewArea);
            } else {
                console.warn('fontInstance or fontInstance.fontRenderer is not defined.');
            }
        });

        // Create the color picker input (hidden)
        const colorPickerInput = document.createElement('input');
        colorPickerInput.type = 'color';
        colorPickerInput.id = 'livePreviewBgColorPicker';
        colorPickerInput.value = '#d3d3d3'; // Default color: lightgrey in hex
        colorPickerInput.style.cssText = `
        width: 0; /* Make it effectively invisible */
        height: 0;
        border: none;
        padding: 0;
        opacity: 0;
        overflow: hidden;
        position: absolute; /* Hide it completely off-screen, or make it just 0x0 */
        pointer-events: none; /* Ensure it doesn't interfere with clicks */
    `;

        // Create a visual button overlay for the color picker
        const colorPickerButton = document.createElement('button');
        colorPickerButton.id = 'livePreviewBgColorButton';
        colorPickerButton.textContent = '🎨'; // Emoji for a color palette icon
        colorPickerButton.title = 'Change Background Color';
        colorPickerButton.style.cssText = `
        width: 35px; /* Adjust width as needed */
        height: 35px; /* Match height of input field + padding */
        background-color: #555; /* Darker background for the button */
        border: 1px solid black; /* Match border of input field */
        border-left: none; /* Remove left border to blend with input */
        border-radius: 0 0 0 0; /* No rounding yet, handled by combined styling */
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px; /* Slightly larger emoji */
        line-height: 1;
        color: white;
        box-sizing: border-box; /* Include padding/border in element's total width/height */
        flex-shrink: 0; /* Prevent button from shrinking */
    `;
        // Event listener for the color picker input
        colorPickerInput.addEventListener('input', (event) => {
            livePreviewArea.style.backgroundColor = event.target.value;
        });

        // Make the button trigger the hidden color input
        colorPickerButton.addEventListener('click', () => {
            // Programmatically trigger the click on the hidden color input
            colorPickerInput.click();
        });


        // New: Magnify Button
        const magnifyButton = document.createElement('button');
        magnifyButton.id = 'magnifyLivePreviewButton';
        magnifyButton.textContent = '🔍'; // Magnifying glass emoji
        magnifyButton.title = 'Toggle Magnified View';
        magnifyButton.style.cssText = `
            width: 35px; /* Adjust width as needed */
            height: 35px; /* Match height of input field + padding */
            background-color: #555; /* Darker background for the button */
            border: 1px solid black; /* Match border of input field */
            border-left: none; /* Remove left border to blend with input */
            border-radius: 0 3px 3px 0; /* Round only the right corners for the last button */
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px; /* Slightly larger emoji */
            line-height: 1;
            color: white;
            box-sizing: border-box; /* Include padding/border in element's total width/height */
            flex-shrink: 0; /* Prevent button from shrinking */
        `;

        // Adjust the border-radius of the colorPickerButton to be square on the right
        colorPickerButton.style.borderRadius = '0';

        magnifyButton.addEventListener('click', () => {
            this.isMagnified = !this.isMagnified; // Toggle magnification state
            if (this.isMagnified) {
                magnifyButton.style.backgroundColor = '#777'; // Indicate active state
                this.magnifyLivePreview(livePreviewArea);
            } else {
                magnifyButton.style.backgroundColor = '#555'; // Reset color
                if (this.magnifiedOverlay) {
                    this.magnifiedOverlay.remove();
                    this.magnifiedOverlay = null;
                }
            }
        });


        // Assemble the input container
        inputContainer.appendChild(inputField);
        inputContainer.appendChild(colorPickerButton); // Add the visible button
        inputContainer.appendChild(magnifyButton); // Add the new magnify button
        inputContainer.appendChild(colorPickerInput);  // Add the hidden color input (can be anywhere, as it's hidden)

        // Assemble the main wrapper element
        livePreviewWrapper.appendChild(livePreviewArea);
        livePreviewWrapper.appendChild(inputContainer); // Append the new input container

        // Add it to the preview column created in createFontPreview
        const previewColumn = document.getElementById('previewColumn');
        if (previewColumn) {
            previewColumn.appendChild(livePreviewWrapper);
        }
        return livePreviewArea;
    }

    async magnifyLivePreview(elementToMagnify) {
        if (!window.html2canvas) {
            console.error("html2canvas library is not loaded. Please include it.");
            return;
        }

        // Create or get the magnification overlay
        if (!this.magnifiedOverlay) {
            this.magnifiedOverlay = document.createElement('div');
            this.magnifiedOverlay.id = 'magnifiedLivePreviewOverlay';
            this.magnifiedOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            cursor: default;
            overflow: hidden;
        `;
            // Only close if clicking on the background, not the slider or image
            this.magnifiedOverlay.addEventListener('click', (event) => {
                if (event.target === this.magnifiedOverlay || event.target.id === 'magnifiedImageContainer') {
                    this.isMagnified = false;
                    const magnifyButton = document.getElementById('magnifyLivePreviewButton');
                    if (magnifyButton) {
                        magnifyButton.style.backgroundColor = '#555'; // Reset button color
                    }
                    this.magnifiedOverlay.remove();
                    this.magnifiedOverlay = null;
                }
            });
            document.body.appendChild(this.magnifiedOverlay);

            // Close Button
            const closeButton = document.createElement('button');
            closeButton.id = 'magnifiedCloseButton';
            closeButton.textContent = '✖'; // Unicode multiplication sign for 'X'
            closeButton.title = 'Close Magnified Preview';
            closeButton.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background-color: rgba(255, 0, 0, 0.8); /* Red, slightly transparent */
            color: white;
            border: none;
            border-radius: 50%; /* Make it circular */
            width: 40px;
            height: 40px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            z-index: 10001; /* Ensure it's above everything else */
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transition: background-color 0.2s ease;
        `;
            closeButton.addEventListener('mouseenter', () => {
                closeButton.style.backgroundColor = 'red';
            });
            closeButton.addEventListener('mouseleave', () => {
                closeButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
            });
            closeButton.addEventListener('click', (event) => {
                event.stopPropagation();
                this.isMagnified = false;
                const magnifyButton = document.getElementById('magnifyLivePreviewButton');
                if (magnifyButton) {
                    magnifyButton.style.backgroundColor = '#555';
                }
                this.magnifiedOverlay.remove();
                this.magnifiedOverlay = null;
            });
            this.magnifiedOverlay.appendChild(closeButton);

            // Container for the draggable image (this will also be our "drop target")
            const draggableImageContainer = document.createElement('div');
            draggableImageContainer.id = 'magnifiedImageContainer';
            draggableImageContainer.style.cssText = `
            position: relative;
            width: 100%;
            height: calc(100% - 70px); /* Leave space for the slider */
            overflow: hidden;
        `;
            draggableImageContainer.ondragover = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
            };
            draggableImageContainer.ondrop = (e) => {
                e.preventDefault();
            };
            this.magnifiedOverlay.appendChild(draggableImageContainer);

            // Create the slider for scale control
            const scaleSlider = document.createElement('input');
            scaleSlider.type = 'range';
            scaleSlider.min = '1';
            scaleSlider.max = '5';
            scaleSlider.value = '3';
            scaleSlider.step = '0.1';
            scaleSlider.id = 'magnifiedScaleSlider';
            scaleSlider.style.cssText = `
            position: absolute;
            bottom: 20px;
            width: 90%;
            max-width: 500px;
            z-index: 10000;
            cursor: grab;
            -webkit-appearance: none;
            height: 8px;
            background: #d3d3d3;
            outline: none;
            opacity: 0.7;
            -webkit-transition: .2s;
            transition: opacity .2s;
            border-radius: 5px;
        `;
            scaleSlider.style.setProperty('--webkit-slider-thumb', `
            -webkit-appearance: none;
            appearance: none;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            background: #4CAF50;
            cursor: pointer;
        `);
            scaleSlider.style.setProperty('--moz-range-thumb', `
            width: 25px;
            height: 25px;
            border-radius: 50%;
            background: #4CAF50;
            cursor: pointer;
        `);
            scaleSlider.style.setProperty('--moz-range-track', `
            width: 100%;
            height: 8px;
            background: #d3d3d3;
            border-radius: 5px;
        `);

            this.magnifiedOverlay.appendChild(scaleSlider);

        } else {
            const draggableImageContainer = this.magnifiedOverlay.querySelector('#magnifiedImageContainer');
            const existingSlider = this.magnifiedOverlay.querySelector('#magnifiedScaleSlider');
            const existingCloseButton = this.magnifiedOverlay.querySelector('#magnifiedCloseButton');

            draggableImageContainer.innerHTML = '';

            if (!this.magnifiedOverlay.contains(draggableImageContainer)) {
                this.magnifiedOverlay.appendChild(draggableImageContainer);
            }
            if (!this.magnifiedOverlay.contains(existingSlider)) {
                this.magnifiedOverlay.appendChild(existingSlider);
            }
            if (!this.magnifiedOverlay.contains(existingCloseButton)) {
                this.magnifiedOverlay.appendChild(existingCloseButton);
            }
        }

        const scaleSliderElement = this.magnifiedOverlay.querySelector('#magnifiedScaleSlider');
        const draggableImageContainer = this.magnifiedOverlay.querySelector('#magnifiedImageContainer');
        const initialScale = parseFloat(scaleSliderElement.value);

        try {
            const canvas = await html2canvas(elementToMagnify, {
                scale: 1,
                useCORS: true,
                backgroundColor: elementToMagnify.style.backgroundColor || '#d3d3d3'
            });

            const img = document.createElement('img');
            img.src = canvas.toDataURL('image/png');
            img.draggable = true;
            img.style.cssText = `
            position: absolute;
            max-width: none;
            max-height: none;
            border: 2px solid white;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
            image-rendering: pixelated;
            cursor: grab;
            top: 50%; /* Keep vertical centering */
        `;

            draggableImageContainer.appendChild(img);

            // --- HTML Drag and Drop API implementation ---
            let startX, startY;
            let initialTranslateX, initialTranslateY;

            img.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', 'magnified-image');
                e.dataTransfer.setDragImage(new Image(), 0, 0);

                const transformMatch = img.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
                initialTranslateX = transformMatch ? parseFloat(transformMatch[1]) : 0;
                initialTranslateY = transformMatch ? parseFloat(transformMatch[2]) : 0;
                startX = e.clientX;
                startY = e.clientY;

                draggableImageContainer.style.cursor = 'grabbing';
            };

            img.ondrag = (e) => {
                if (e.clientX === 0 && e.clientY === 0) return;

                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                let newX = initialTranslateX + dx;
                let newY = initialTranslateY + dy;

                img.style.transform = `translate(${newX}px, ${newY}px) scale(${parseFloat(scaleSliderElement.value)})`;
            };

            img.ondragend = () => {
                draggableImageContainer.style.cursor = 'grab';
            };

            // Add event listener to the slider to update the image scale
            scaleSliderElement.oninput = () => {
                const newScale = parseFloat(scaleSliderElement.value);
                const transformMatch = img.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
                let currentTranslateX = transformMatch ? parseFloat(transformMatch[1]) : 0;
                let currentTranslateY = transformMatch ? parseFloat(transformMatch[2]) : 0;

                img.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${newScale})`;
            };

            // --- CHANGE: Position the left edge in the center of the screen ---
            img.onload = () => {
                const containerRect = draggableImageContainer.getBoundingClientRect();

                // Calculate scaled dimensions (important for correct positioning)
                const scaledWidth = canvas.width * initialScale;
                const scaledHeight = canvas.height * initialScale;

                // Calculate offsetX: half of the container's width (which is the center)
                // Minus the image's current left offset (which is 0 when using transform-origin 0 0)
                let offsetX = containerRect.width / 2;

                // Calculate offsetY: half of the container's height minus half of the scaled image's height
                let offsetY = (containerRect.height - scaledHeight) / 4;


                // Apply initial positioning and scale
                // We use transform-origin: 0 0; so translate(x,y) positions the top-left corner
                img.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${initialScale})`;

                // Store this initial position as the starting point for future drags
                initialTranslateX = offsetX;
                initialTranslateY = offsetY;
            };

        } catch (error) {
            console.error("Error capturing live preview for magnification:", error);
            draggableImageContainer.innerHTML = '<p style="color: white;">Error magnifying preview. Check console for details.</p>';
        }
    }

    async parseFontTxt(txt) {
        // Read the file content with Windows-1251 encoding
        const fileContent = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsText(txt, 'windows-1251');
        });
        this.spaceValue = parseInt(fileContent.match(/LayerSetCharWidths\s+Main\s+\('\s+'\)\s+\((\d+)\);/)[1]);
        // Create the result object with characters array
        const result = {
            characters: []
        };

        // --- New: Track matched segments for appendix ---
        const matchedSegments = []; // Stores objects like { start: index, end: index }

        // Helper to add a segment if a match is found
        const addMatchedSegment = (match) => {
            if (match && match.index !== undefined) {
                matchedSegments.push({
                    start: match.index,
                    end: match.index + match[0].length
                });
            }
        };
        // --- End New ---

        try {
            // Define regex patterns and store matches
            const sectionRegexes = {
                charList: /Define\s+CharList\s*\n\s*\(([\s\S]*?)\);/m,
                widthList: /Define\s+WidthList\s*\n\s*\(([\s\S]*?)\);/m,
                rectList: /Define\s+RectList\s*\n\s*\(([\s\S]*?)\);/m,
                offsetList: /Define\s+OffsetList\s*\n\s*\(([\s\S]*?)\);/m,
                kerningPairs: /Define\s+KerningPairs\s*\n\s*\(([\s\S]*?)\);/m,
                kerningValues: /Define\s+KerningValues\s*\(([\s\S]*?)\);/m // Note: This one might not have the newline after "Define...;"
            };

            const sections = {};
            for (const key in sectionRegexes) {
                const match = fileContent.match(sectionRegexes[key]);
                sections[key] = match;
                addMatchedSegment(match); // Record the matched segment
            }

            // Check if all required sections were found
            const requiredSections = ['charList', 'widthList', 'rectList'];
            for (const key of requiredSections) {
                if (!sections[key]) {
                    console.warn(`Required section "${key}" not found in font file`);
                }
            }

            // Parse character list
            const charList = [];
            if (sections.charList && typeof sections.charList[1] === 'string') {
                const charRegex = /'(.?)'|"'"/g;
                let charMatch;
                while ((charMatch = charRegex.exec(sections.charList[1])) !== null) {
                    if (charMatch[0] === "\"'\"") {
                        charList.push("'");
                    } else {
                        charList.push(charMatch[1]);
                    }
                }
            }

            // Parse width list
            const widthList = [];
            if (sections.widthList) {
                const widthStr = sections.widthList[1].replace(/\s+/g, ' ');
                const widthMatches = widthStr.match(/\d+/g);
                if (widthMatches) {
                    widthMatches.forEach(num => {
                        widthList.push(parseInt(num, 10));
                    });
                }
            }

            // Parse rect list
            const rectList = [];
            if (sections.rectList) {
                const rectRegex = /\(\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/g;
                let rectMatch;
                while ((rectMatch = rectRegex.exec(sections.rectList[1])) !== null) {
                    rectList.push([
                        parseInt(rectMatch[1], 10),
                        parseInt(rectMatch[2], 10),
                        parseInt(rectMatch[3], 10),
                        parseInt(rectMatch[4], 10)
                    ]);
                }
            }

            // Parse offset list (optional)
            const offsetList = [];
            if (sections.offsetList) {
                const offsetRegex = /\(\s*(-?\d+),\s*(-?\d+)\s*\)/g;
                let offsetMatch;
                while ((offsetMatch = offsetRegex.exec(sections.offsetList[1])) !== null) {
                    offsetList.push([
                        parseInt(offsetMatch[1], 10),
                        parseInt(offsetMatch[2], 10)
                    ]);
                }
            }

            // Create character objects
            for (let i = 0; i < charList.length; i++) {
                if (i < widthList.length && i < rectList.length) {
                    const charObj = {
                        character: charList[i],
                        width: widthList[i],
                        rect: rectList[i]
                    };

                    // Add offset if available for this character
                    if (offsetList.length > 0 && i < offsetList.length) {
                        charObj.offset = offsetList[i];
                    }

                    result.characters.push(charObj);
                }
            }

            // Only create kerning object if both kerning pairs and values are present
            if (sections.kerningPairs && sections.kerningValues) {
                result.kerning = {};

                // Parse kerning pairs
                const kerningPairs = [];
                const pairRegex = /"([^"]*)"/g;
                let pairMatch;
                while ((pairMatch = pairRegex.exec(sections.kerningPairs[1])) !== null) {
                    kerningPairs.push(pairMatch[1]);
                }

                // Parse kerning values
                const kerningValues = [];
                const valueStr = sections.kerningValues[1].replace(/\s+/g, ' ');
                const valueMatches = valueStr.match(/-?\d+/g);
                if (valueMatches) {
                    valueMatches.forEach(num => {
                        kerningValues.push(parseInt(num, 10));
                    });
                }

                // Populate kerning object
                for (let i = 0; i < kerningPairs.length; i++) {
                    if (i < kerningValues.length) {
                        result.kerning[kerningPairs[i]] = kerningValues[i];
                    }
                }
            }

            // --- New: Determine the appendix ---

            // 1. Sort the segments by their start index
            matchedSegments.sort((a, b) => a.start - b.start);

            // 2. Merge overlapping or adjacent segments
            const mergedSegments = [];
            if (matchedSegments.length > 0) {
                let current = { ...matchedSegments[0] }; // Start with the first segment

                for (let i = 1; i < matchedSegments.length; i++) {
                    const next = matchedSegments[i];
                    // If the next segment overlaps or is adjacent to the current one
                    if (next.start <= current.end + 1) { // +1 to account for potential single space/newline separation
                        current.end = Math.max(current.end, next.end); // Extend the current segment
                    } else {
                        mergedSegments.push(current); // Current segment is complete, add it
                        current = { ...next }; // Start a new current segment
                    }
                }
                mergedSegments.push(current); // Add the last current segment
            }

            // 3. Extract unparsed parts (appendix)
            let appendixParts = [];
            let lastEnd = 0; // Tracks the end of the last parsed segment

            for (const segment of mergedSegments) {
                if (segment.start > lastEnd) {
                    // There's a gap between the last parsed segment and the current one
                    appendixParts.push(fileContent.substring(lastEnd, segment.start));
                }
                lastEnd = Math.max(lastEnd, segment.end); // Update lastEnd to the end of the current segment
            }

            // If there's content after the last parsed segment
            if (lastEnd < fileContent.length) {
                appendixParts.push(fileContent.substring(lastEnd));
            }

            // Join all unparsed parts and assign to this.appendix
            this.appendix = appendixParts.join('').trim();
            // --- End New ---

            console.log("Font parsed successfully:", result);
            console.log("Appendix:", this.appendix); // Log the appendix
            return result;
        } catch (error) {
            console.error("Error parsing font file:", error);
            throw new Error(`Failed to parse font file: ${error.message}`);
        }
    }

    serializeFontData(data = this.fontData, appendix = this.appendix) {
        let serializedString = "";
        const INDENT = "  "; // Two spaces for indentation

        // Helper to format lists with wrapping, including internal commas and newlines
        const formatList = (items, itemFormatter, itemsPerLine, indentLevel = 1, key = null) => {
            let contentLines = [];
            let currentLineItems = [];
            let currentLineLength = 0;

            // Adjust base and subsequent indentation based on key
            // The example output for WidthList has a base indent of 2 spaces, and subsequent lines 4 spaces.
            // For others, it's 2 spaces for base, and 4 spaces for subsequent.
            const baseIndent = key === "width" ? INDENT.repeat(2) : INDENT.repeat(indentLevel);
            const subsequentIndent = key === "width" ? INDENT.repeat(4) : INDENT.repeat(indentLevel + 2);

            for (let i = 0; i < items.length; i++) {
                const itemStr = itemFormatter(items[i]);
                // Estimate length including comma and space for items within a line
                const estimatedItemLength = itemStr.length + (i < items.length - 1 ? 2 : 0); // +2 for ", "

                // Check if adding this item exceeds line length or items per line, and if it's not the very first item on a line
                if ((currentLineLength + estimatedItemLength > 78 && currentLineItems.length > 0) || currentLineItems.length >= itemsPerLine) {
                    contentLines.push(currentLineItems.join(', '));
                    currentLineItems = [];
                    currentLineLength = 0;
                }

                currentLineItems.push(itemStr);
                currentLineLength += estimatedItemLength;
            }
            if (currentLineItems.length > 0) {
                contentLines.push(currentLineItems.join(', '));
            }

            // Now, join the content lines with proper indentation and commas
            // The last line will not have a trailing comma, which is handled by the overall structure
            return contentLines.map((line, index) => {
                const linePrefix = index === 0 ? baseIndent : subsequentIndent;
                return linePrefix + line;
            }).join(',\n'); // Join lines with comma and newline
        };

        // --- Define CharList ---
        if (data.characters && data.characters.length > 0) {
            const charItems = data.characters.map(charObj => {
                // Handle the special case for single quote character
                if (charObj.character === "'") {
                    return `\"'\"`; // Represent as "'"
                }
                return `'${charObj.character}'`;
            });

            let formattedChars = formatList(charItems, item => item, 17, 1); // Indent level 1
            // Remove the trailing comma from the last line if it exists
            if (formattedChars.endsWith(',')) {
                formattedChars = formattedChars.slice(0, -1);
            }
            serializedString += `Define CharList\n  (\n${formattedChars}\n  );\n\n`;
        }

        // --- Define WidthList ---
        if (data.characters && data.characters.length > 0) {
            const widthItems = data.characters.map(charObj => charObj.width);
            const paddedWidths = widthItems.map(w => String(w).padStart(3, ' ')); // Pad to 3 characters

            let formattedWidths = formatList(paddedWidths, item => item, 16, 1, "width"); // Indent level 1, key "width"
            // Remove the trailing comma from the last line if it exists
            if (formattedWidths.endsWith(',')) {
                formattedWidths = formattedWidths.slice(0, -1);
            }
            serializedString += `Define WidthList\n  (\n${formattedWidths}\n  );\n\n`;
        }

        // --- Define RectList ---
        if (data.characters && data.characters.length > 0) {
            const rectItems = data.characters.map(charObj => charObj.rect);
            const formattedRects = rectItems.map(rect => {
                // Pad each number in the rect to ensure consistent spacing
                const [x, y, w, h] = rect;
                return `(${String(x).padStart(4, ' ')}, ${String(y).padStart(2, ' ')}, ${String(w).padStart(2, ' ')}, ${String(h).padStart(2, ' ')})`;
            });

            let formattedRectList = formatList(formattedRects, item => item, 4, 1); // Indent level 1
            // Remove the trailing comma from the last line if it exists
            if (formattedRectList.endsWith(',')) {
                formattedRectList = formattedRectList.slice(0, -1);
            }
            serializedString += `Define RectList\n  (\n${formattedRectList}\n  );\n\n`;
        }

        // --- Define OffsetList (Optional) ---
        // Check if any character has an offset defined
        const hasOffsets = data.characters.some(charObj => charObj.offset !== undefined);
        if (hasOffsets) {
            const offsetItems = data.characters.map(charObj => charObj.offset || [0, 0]); // Default to [0,0] if missing
            const formattedOffsets = offsetItems.map(offset => {
                const [dx, dy] = offset;
                // Pad numbers to ensure consistent spacing for offsets
                return `(${String(dx).padStart(3, ' ')}, ${String(dy).padStart(2, ' ')})`;
            });

            let formattedOffsetList = formatList(formattedOffsets, item => item, 8, 1); // Indent level 1
            // Remove the trailing comma from the last line if it exists
            if (formattedOffsetList.endsWith(',')) {
                formattedOffsetList = formattedOffsetList.slice(0, -1);
            }
            serializedString += `Define OffsetList\n  (\n${formattedOffsetList}\n  );\n\n`;
        }

        // --- Define KerningPairs and KerningValues (Optional) ---
        if (data.kerning && Object.keys(data.kerning).length > 0) {
            const kerningPairs = Object.keys(data.kerning);
            const kerningValues = Object.values(data.kerning);

            // Kerning Pairs
            const formattedKerningPairs = kerningPairs.map(pair => `"${pair}"`);
            let serializedKerningPairs = formatList(formattedKerningPairs, item => item, 8, 1); // Indent level 1
            // Remove the trailing comma from the last line if it exists
            if (serializedKerningPairs.endsWith(',')) {
                serializedKerningPairs = serializedKerningPairs.slice(0, -1);
            }
            serializedString += `Define KerningPairs\n  (\n${serializedKerningPairs}\n  );\n\n`;

            // Kerning Values
            const paddedKerningValues = kerningValues.map(val => String(val).padStart(3, ' ')); // Pad to 3 characters
            let serializedKerningValues = formatList(paddedKerningValues, item => item, 16, 1); // Indent level 1
            // Remove the trailing comma from the last line if it exists
            if (serializedKerningValues.endsWith(',')) {
                serializedKerningValues = serializedKerningValues.slice(0, -1);
            }
            serializedString += `Define KerningValues\n  (\n${serializedKerningValues}\n  );\n\n`;
        }

        // Add the appendix at the end if it exists
        if (appendix) {
            serializedString += `${appendix}\n`;
        }

        return serializedString;
    }

    downloadSerializedFontFile(originalFileName) {
        const serializedContent = this.serializeFontData();
        const blob = new Blob([windows1251.encode(serializedContent)], {
            type: 'text/plain;charset=windows-1251'
        });

        // Create a download link
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        // Ensure the filename ends with .txt
        const fileName = originalFileName.endsWith('.txt') ? originalFileName : `${originalFileName}.txt`;
        a.download = fileName;

        // Append to body and click it programmatically
        document.body.appendChild(a);
        a.click();
        // Clean up
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }
}

// Fix the file input event handler to properly handle files
FILEINPUT.onchange = (event) => {
    handleFileSelection(event);
};

// Add this function to handle file selection
function handleFileSelection(event) {
    let downloadButton = document.getElementById('downloadButton');
    if (downloadButton) {
        downloadButton.remove()
    }
    // Clear the previous file list
    FILESLIST.innerHTML = '';

    // Remove the previous image preview if it exists
    const existingPreview = document.getElementById('imageWindow');
    if (existingPreview) {
        // Clean up any object URLs to prevent memory leaks
        const images = existingPreview.querySelectorAll('img');
        Array.from(images).forEach(img => {
            URL.revokeObjectURL(img.src);
        });
        existingPreview.remove();
    }

    let fontImages = [];
    let fontText;
    let fontName;
    fontFiles = event.target.files;

    for (let file of fontFiles) {
        console.log(file.type);
        if (file.type === "text/plain") {
            fontName = file.name.replace(".txt", "");
            fontText = file;
        }
        if (file.type === "image/png") {
            fontImages.push(file);
        }
    }

    if (fontImages.length > 0 && fontText) {
        for (let image of fontImages) {
            if (!image.name.includes(fontName)) {
                FINEINPUTLABEL.innerHTML = "One or all of the image file names do not match the .txt file name <br>";
                FILEINPUT.value = null;
                return;
            }
        }
        if (fontText) {

            let txtName = document.createElement("li");
            txtName.textContent = fontText.name;
            FILESLIST.appendChild(txtName);

            for (let image of fontImages) {
                let imgName = document.createElement("li");
                imgName.textContent = image.name;
                FILESLIST.appendChild(imgName);
            }

            FINEINPUTLABEL.innerHTML = "Files Selected <br>";
            fontInstance = new Font(fontText, fontImages);
            //window.fontInstance = fontInstance;
        } else {
            FINEINPUTLABEL.innerHTML = "Please select a .txt file <br>";
            FILEINPUT.value = null;
        }
    }
}