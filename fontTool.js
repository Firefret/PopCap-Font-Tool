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
        let signatureElement = document.createElement('span');
        signatureElement.textContent = "PopCap Font Tool by Firefret"
        signatureElement.style.position = "absolute";
        signatureElement.style.bottom = "10px";
        signatureElement.style.right = "10px";
        signatureElement.style.color = "grey";
        UPLOADFILES.appendChild(signatureElement);
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
        inputArray.forEach(char => {
            let img = document.createElement('img');
            let charInstance = fontInstance.fontData.characters.find(charObj => charObj.character === char);

            if(char === " "){
                let spaceDiv = document.createElement('div');
                spaceDiv.style.width = `${fontInstance.spaceValue}px`;
                spaceDiv.style.height = `${fontInstance.fontData.characters[0].rect[3]}px`;
                spaceDiv.style.display = 'inline-block';
                spaceDiv.style.position = 'relative';
                previewArea.appendChild(spaceDiv);
                spaceDiv.style.left = `-${widthAccumulator}px`;
                widthAccumulator += fontInstance.spaceValue;
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
                if(!previousChar){
                    img.style.left = `${charInstance.offset[0]+(charInstance.rect[2] - charInstance.width)}px`;
                }
                if(previousChar instanceof HTMLImageElement){
                    img.style.left = `-${widthAccumulator - charInstance.offset[0]}px`;
                    widthAccumulator += ((charInstance.rect[2]  - charInstance.width));
                }
                else if(previousChar instanceof HTMLDivElement){
                    img.style.left = `-${widthAccumulator - charInstance.offset[0]-fontInstance.spaceValue}px`;
                    widthAccumulator += ((charInstance.rect[2]  - charInstance.width)-fontInstance.spaceValue);
                }
            }
        })
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
        background-color: lightgrey;
        border: 1px solid black;
        padding: 10px 0;
        box-sizing: border-box;
    `;

        // Create the input field
        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.id = 'livePreviewInput';
        inputField.placeholder = 'Type here for live preview...';
        inputField.style.cssText = `
        margin-top: 5px;
        width: 100%;
        padding: 5px;
        box-sizing: border-box;
    `;
    inputField.addEventListener('input', () => {
       fontInstance.fontRenderer(fontInstance.fontPreviewArea);
    })
        // Assemble the element
        livePreviewWrapper.appendChild(livePreviewArea);
        livePreviewWrapper.appendChild(inputField);

        // Add it to the preview column created in createFontPreview
        const previewColumn = document.getElementById('previewColumn');
        if (previewColumn) {
            previewColumn.appendChild(livePreviewWrapper);
        }
        return livePreviewArea;
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

        // --- Append the appendix ---
        if (appendix && appendix.length > 0) {
            serializedString += appendix + "\n"; // Add appendix, followed by a newline
        }

        // ** NEW: Encode the serialized string to Windows-1251 **
         // This returns a Uint8Array
        // To turn it into a Blob, you'll typically use:
        // const blob = new Blob([encodedData], { type: 'application/octet-stream' });
        // or if it's meant to be a text file with windows-1251 encoding:
        // const blob = new Blob([encodedData], { type: 'text/plain; charset=windows-1251' });

        // The function is currently returning a string. If you need to return the encoded Uint8Array
        // or a Blob directly, you would modify the return statement.
        // For now, I'll return the encoded Uint8Array as it's the direct result of the encoding step.
        return windows1251.encode(serializedString); // Return the Uint8Array of windows-1251 encoded bytes
    }

    downloadSerializedFontFile(filename) {
        let content = this.serializeFontData();
        console.log(content);
        const blob = new Blob([content], { type: 'text/plain;charset=windows-1251' }); // Specify Windows-1251 encoding
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Append to body is necessary for Firefox
        a.click();

        // Clean up: remove the element and revoke the URL
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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