import {removeBlack} from './removeBlack.js';

const FILEINPUT = document.getElementById("fontdata");
const FINEINPUTLABEL = document.getElementById("fontdatalabel");
const FILESLIST = document.getElementById("fileslist");
const UPLOADFILES = document.getElementById("uploadfiles");

let fontInstance;
let fontFiles = [];

class Font {
    constructor(text, images) {
        this.text = text;
        this.images = images;
        this.createFontPreview();
        this.fontData = this.parseFontTxt(text)
        console.dir(this.fontData);
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

    async createFontPreview() {
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

            // If the filename starts with underscore, the process with removeBlack
            if (image.name.startsWith('_')) {
                img.src = await removeBlack(image);
            } else {
                img.src = URL.createObjectURL(image);
            }

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

        const parent = UPLOADFILES.parentElement;
        parent.style.display = 'flex';
        parent.style.gap = '10px';    // Adds space between elements
        parent.style.alignItems = 'start'; // Aligns items at the top

        UPLOADFILES.after(scrollDiv);
        UPLOADFILES.style.height = scrollDiv.style.height;

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

            // Create character objects
            for (let i = 0; i < charList.length; i++) {
                if (i < widthList.length && i < rectList.length) {
                    result.characters.push({
                        character: charList[i],
                        width: widthList[i],
                        rect: rectList[i]
                    });
                }
            }

            // Only create a kerning object if both kerning pairs and values are present
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