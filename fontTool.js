import {removeBlack} from './removeBlack.js';

const FILEINPUT = document.getElementById("fontdata");
const FINEINPUTLABEL = document.getElementById("fontdatalabel");
const FILESLIST = document.getElementById("fileslist");
//const UPLOADFILES = document.getElementById("uploadfiles");

let fontInstance;
let fontFiles = [];

class Font {
    constructor(text, images) {
        this.text = text;
        this.images = images;
        this.createFontPreview();
        
        // Use an async IIFE to handle the async font parsing
        (async () => {
            try {
                this.fontData = await this.parseFontTxt(text);
                console.dir(this.fontData);
                
                // Draw tables after font data is available
                this.drawTable();
            } catch (error) {
                console.error("Error initializing font:", error);
            }
        })();
    }

    getFilesEvent(event) {
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
        } else {
            FINEINPUTLABEL.innerHTML = "Please select a .txt file and png image files <br>";
            FILEINPUT.value = null;
        }
    }

drawTable() {
    // Remove any existing tables
    const existingTables = document.getElementById('fontDataTables');
    if (existingTables) {
        existingTables.remove();
    }

    // Create container for tables with flex layout
    const tablesContainer = document.createElement('div');
    tablesContainer.id = 'fontDataTables';
    tablesContainer.style.cssText = `
        margin-top: 20px;
        font-family: Arial, sans-serif;
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        align-items: flex-start;
    `;

    // Create character table
    const characterTableContainer = this.createCharactersTable();
    characterTableContainer.style.flex = '0 1 auto';
    tablesContainer.appendChild(characterTableContainer);

    // Create kerning table if kerning data exists
    if (this.fontData && this.fontData.kerning) {
        const kerningTableContainer = this.createKerningTable();
        kerningTableContainer.style.flex = '0 1 auto';
        tablesContainer.appendChild(kerningTableContainer);
    }

    // Position the tables after the top row container
    const topRow = document.getElementById('topRowContainer');
    if (topRow) {
        topRow.after(tablesContainer);
    } else {
        // Fallback: add after image window or upload element
        const imageWindow = document.getElementById('imageWindow');
        if (imageWindow) {
            imageWindow.after(tablesContainer);
        } else {
            document.getElementById('uploadfiles').after(tablesContainer);
        }
    }
}

// Helper method to create a table container
createTableContainer(title) {
    const container = document.createElement('div');
    container.className = 'table-container';
    container.style.cssText = `
        margin-bottom: 30px;
        overflow-x: auto;
        width: auto;
    `;

    const heading = document.createElement('h2');
    heading.textContent = title;
    heading.style.cssText = `
        margin-bottom: 10px;
        color: #333;
    `;
    container.appendChild(heading);

    const table = document.createElement('table');
    table.style.cssText = `
        border-collapse: collapse;
        border: 1px solid #ddd;
        font-size: 14px;
        width: auto;
    `;
    
    container.appendChild(table);
    return { container, table };
}

// Helper method to create a table header row
createTableHeader(headers) {
    const thead = document.createElement('thead');
    thead.style.backgroundColor = '#f2f2f2';
    
    const headerRow = document.createElement('tr');
    
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.style.cssText = `
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
        `;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    return thead;
}

createCharactersTable() {
    const { container, table } = this.createTableContainer('Character Data');
    
    // Determine if any character has offset data
    const hasOffset = this.fontData.characters.some(char => char.offset);
    
    // Create headers
    const headers = ['Index', 'Character', 'Width', 'Rectangle (x, y, w, h)'];
    if (hasOffset) {
        headers.push('Offset (x, y)');
    }
    
    table.appendChild(this.createTableHeader(headers));

    // Create table body
    const tbody = document.createElement('tbody');
    
    this.fontData.characters.forEach((char, index) => {
        const row = document.createElement('tr');
        row.style.cssText = index % 2 === 0 ? 'background-color: #f9f9f9;' : '';
        
        // Index cell
        const indexCell = document.createElement('td');
        indexCell.textContent = index;
        indexCell.style.cssText = 'padding: 8px; border: 1px solid #ddd;';
        row.appendChild(indexCell);
        
        // Character cell
        const charCell = document.createElement('td');
        if (char.character === '') {
            charCell.textContent = '(space)';
            charCell.style.fontStyle = 'italic';
        } else if (char.character === '\n') {
            charCell.textContent = '(newline)';
            charCell.style.fontStyle = 'italic';
        } else {
            charCell.textContent = char.character;
            charCell.style.fontWeight = 'bold';
        }
        charCell.style.cssText += 'padding: 8px; border: 1px solid #ddd;';
        row.appendChild(charCell);
        
        // Width cell
        const widthCell = document.createElement('td');
        widthCell.textContent = char.width;
        widthCell.style.cssText = 'padding: 8px; border: 1px solid #ddd;';
        row.appendChild(widthCell);
        
        // Rectangle cell
        const rectCell = document.createElement('td');
        rectCell.textContent = char.rect.join(', ');
        rectCell.style.cssText = 'padding: 8px; border: 1px solid #ddd;';
        row.appendChild(rectCell);
        
        // Offset cell (if needed)
        if (hasOffset) {
            const offsetCell = document.createElement('td');
            if (char.offset) {
                offsetCell.textContent = char.offset.join(', ');
            } else {
                offsetCell.textContent = '—';
                offsetCell.style.textAlign = 'center';
            }
            offsetCell.style.cssText += 'padding: 8px; border: 1px solid #ddd;';
            row.appendChild(offsetCell);
        }
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    return container;
}

createKerningTable() {
    const { container, table } = this.createTableContainer('Kerning Pairs');
    
    // Create headers
    table.appendChild(this.createTableHeader(['Character Pair', 'Kerning Value']));

    // Create table body
    const tbody = document.createElement('tbody');
    
    // Get all kerning pairs and sort them alphabetically
    const kerningPairs = Object.keys(this.fontData.kerning).sort();
    
    kerningPairs.forEach((pair, index) => {
        const row = document.createElement('tr');
        row.style.cssText = index % 2 === 0 ? 'background-color: #f9f9f9;' : '';
        
        // Pair cell
        const pairCell = document.createElement('td');
        pairCell.textContent = `"${pair}"`;
        pairCell.style.cssText = 'padding: 8px; border: 1px solid #ddd; font-family: monospace;';
        row.appendChild(pairCell);
        
        // Value cell
        const valueCell = document.createElement('td');
        valueCell.textContent = this.fontData.kerning[pair];
        valueCell.style.cssText = 'padding: 8px; border: 1px solid #ddd;';
        row.appendChild(valueCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    return container;
}

async createFontPreview() {
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
        width: 700px;
        height: 200px;
        overflow-x: scroll;
        overflow-y: hidden;
        white-space: nowrap;
        background-color: lightgrey;
        border: 1px solid black;
        padding: 10px;
        display: inline-block;
    `;

    // Create a container for overlapped images
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
        position: relative;
        height: 100%;
        display: inline-block;
    `;

    // Sort images so that Outline images come first (will be rendered at the bottom)
    const sortedImages = [...this.images].sort((a, b) => {
        const aIsOutline = a.name.endsWith('Outline.png');
        const bIsOutline = b.name.endsWith('Outline.png');
        if (aIsOutline && !bIsOutline) return -1;
        if (!aIsOutline && bIsOutline) return 1;
        return 0;
    });

    // Process images and add them as overlapped layers
    for (const image of sortedImages) {
        const img = document.createElement('img');
        img.src = image.name.startsWith('_') 
            ? await removeBlack(image) 
            : URL.createObjectURL(image);

        img.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: auto;
            z-index: ${image.name.endsWith('Outline.png') ? 1 : 2};
        `;

        imageContainer.appendChild(img);
    }

    scrollDiv.appendChild(imageContainer);

    // Set container width based on the natural aspect ratio of images
    const firstImg = imageContainer.querySelector('img');
    firstImg.onload = () => {
        const aspectRatio = firstImg.naturalWidth / firstImg.naturalHeight;
        const containerHeight = scrollDiv.clientHeight - 20; // subtract padding
        imageContainer.style.width = `${containerHeight * aspectRatio}px`;
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
        parent.insertBefore(topRow, parent.firstChild);
        topRow.appendChild(uploadElement);
    }
    
    // Add the image preview to the top row
    topRow.appendChild(scrollDiv);
    
    // Make upload area match the height of the preview
    uploadElement.style.height = scrollDiv.style.height;

    // Cleanup object URLs on unload
    window.addEventListener('unload', () => {
        const images = imageContainer.getElementsByTagName('img');
        Array.from(images).forEach(img => {
            URL.revokeObjectURL(img.src);
        });
    });
}

    async parseFontTxt(txt) {
        // Read the file content with Windows-1251 encoding
        const fileContent = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsText(txt, 'windows-1251');
        });

        // Create the result object with characters array
        const result = {
            characters: []
        };

        try {
            // Extract all sections using more flexible regex patterns
            const sections = {
                charList: fileContent.match(/Define\s+CharList\s*\n\s*\(([\s\S]*?)\);/),
                widthList: fileContent.match(/Define\s+WidthList\s*\n\s*\(([\s\S]*?)\);/),
                rectList: fileContent.match(/Define\s+RectList\s*\n\s*\(([\s\S]*?)\);/),
                offsetList: fileContent.match(/Define\s+OffsetList\s*\n\s*\(([\s\S]*?)\);/),
                kerningPairs: fileContent.match(/Define\s+KerningPairs\s*\n\s*\(([\s\S]*?)\);/),
                kerningValues: fileContent.match(/Define\s+KerningValues\s*\(([\s\S]*?)\);/)
            };

            // Check if all required sections were found
            const requiredSections = ['charList', 'widthList', 'rectList'];
            for (const key of requiredSections) {
                if (!sections[key]) {
                    console.warn(`Required section "${key}" not found in font file`);
                }
            }

            // Parse character list
            const charList = [];
            if (sections.charList) {
                const charRegex = /'(.?)'/g;
                let charMatch;
                while ((charMatch = charRegex.exec(sections.charList[1])) !== null) {
                    charList.push(charMatch[1]);
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

            console.log("Font parsed successfully:", result);
            return result;
        } catch (error) {
            console.error("Error parsing font file:", error);
            throw new Error(`Failed to parse font file: ${error.message}`);
        }
    }
}
FILEINPUT.onchange = Font.prototype.getFilesEvent;