import * as imageUtil from "./imageUtil.js";

/**
 * Creates and displays a table representation of the font data
 * @returns {HTMLElement} The created table element
 * @param fontUI
 */
async function drawTable(fontUI) {
    let mergedFontImage = fontUI.fontInstance.mergedFontImage;
    let fontData = fontUI.fontInstance.fontData;
    let characters = fontUI.fontInstance.fontData.characters;
    let fontRenderer = fontUI.fontRenderer.bind(fontUI);
    let fontPreviewArea = fontUI.fontInstance.fontPreviewArea;
    
    if (!fontData || fontData.characters.length === 0) {
        console.warn('No valid font data provided to draw table');
        return null;
    }

    // --- NEW: Initialize fontData.kerning if it doesn't exist ---
    if (!fontData.kerning) {
        fontData.kerning = {}; // Initialize as an empty object
    }
    // --- END NEW ---

    // Remove any existing tables and containers
    const existingContainer = document.getElementById('fontDataContainer');
    if (existingContainer) {
        existingContainer.remove();
    }

    // Create a container for tables to sit side by side
    const tablesContainer = document.createElement('div');
    tablesContainer.id = 'fontDataContainer';
    document.body.appendChild(tablesContainer);

    // Create a wrapper for the character table
    const tableWrapper = document.createElement('div');

    // Create table element
    const table = document.createElement('table');
    table.id = 'fontDataTable';
    table.className = 'data-table';

    // Create table header
    const thead = document.createElement('thead');
    thead.style.cssText = `
        background-color: #009879;
        color: white;
        text-align: left;
    `;

    const headerRow = document.createElement('tr');
    const headers = ['', 'Character', 'Width', 'Rectangle (x, y, w, h)',];

    // Add Offset header if any character has offset data
    const hasOffsets = fontData.characters.some(char => char.offset);
    if (hasOffsets) {
        headers.push('Offset (x, y)');
    }

    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        th.style.width = "fit-content";
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    fontData.characters.forEach((char, index) => {
        const row = document.createElement('tr');
        row.style.cssText = `
            border-bottom: 1px solid #dddddd;
            ${index % 2 === 0 ? 'background-color: #f3f3f3;' : ''}
        `;
        //0. Remove Row and data button
        const deleteCell = document.createElement('td');
        row.appendChild(deleteCell);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '✖';
        deleteButton.style.cssText = `
        background-color: #f44336;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
    `;
        deleteButton.addEventListener('click', function() {
            delete fontData.characters[index];
            fontData.characters = fontData.characters.filter(c => c !== undefined);

            // Remove the row from the UI
            row.remove();

            // Update alternating row colors
            const tbody = document.querySelector('#kerningDataTable tbody');
            if (tbody) {
                updateKerningRowColors(tbody);
            }

            // Re-render the font
            fontRenderer(fontPreviewArea);

            console.log(`Character "${char}" removed`);
        });

        deleteCell.appendChild(deleteButton);


        // 1. Character cell
        const charCell = document.createElement('td');
        if (char.character === ' ') {
            charCell.textContent = '(space)';
        } else if (char.character === '\n') {
            charCell.textContent = '(newline)';
        } else if (char.character === '\t') {
            charCell.textContent = '(tab)';
        } else {
            charCell.textContent = char.character;
        }
        charCell.style.width = "fit-content";
        row.appendChild(charCell);


        // 2. Width cell
        const widthCell = document.createElement('td');
        const widthValue = document.createElement("input");
        widthValue.type = "text";
        widthValue.value = char.width;
        widthValue.addEventListener("keyup", async function (event) {
            setTimeout(() => null, 0)
            characters[index].width = parseInt(event.target.value);
            console.log(fontData)
            imageUtil.cutFontImageToChars(mergedFontImage, characters).then(()=>{
                if (typeof fontInstance !== 'undefined' && fontRenderer) {
                    fontRenderer(fontPreviewArea);
                }
            })

        })
        widthCell.style.width = "fit-content";
        widthCell.appendChild(widthValue);
        row.appendChild(widthCell);


        // 3. Rectangle cell
        const rectCell = document.createElement('td');
        const rectValue = document.createElement("input");
        rectValue.type = "text";
        rectValue.value = char.rect.join(', '); // Join array elements for display
        rectValue.addEventListener("keyup", function(event) {
            fontData.characters[index].rect = event.target.value.split(",").map(Number); // Ensure numbers
            console.log(fontData)
            imageUtil.cutFontImageToChars(mergedFontImage, characters).then(()=>{
                if (typeof fontInstance !== 'undefined' && fontRenderer) {
                    fontRenderer(fontPreviewArea).then(() => console.log(`Font rerendered`));
                }
            })
        })
        rectCell.style.width = "fit-content";
        rectCell.appendChild(rectValue);
        row.appendChild(rectCell);

        // 4. Offset cell (if applicable)
        if (hasOffsets) {
            const offsetCell = document.createElement('td');
            const offsetValue = document.createElement("input");
            offsetCell.style.width = "fit-content";
            offsetValue.type = "text";
            offsetValue.value = char.offset ? char.offset.join(', ') : ''; // Handle undefined offset, join array
            offsetValue.addEventListener("keyup", function(event) {
                characters[index].offset = event.target.value.split(",").map(Number); // Ensure numbers
                console.dir(fontData);

                imageUtil.cutFontImageToChars(mergedFontImage, characters).then(()=>{
                    if (typeof fontInstance !== 'undefined' && fontRenderer) {
                        fontRenderer(fontPreviewArea).then(() => console.log(`Font rerendered`));
                    }
                })
            })
            offsetCell.appendChild(offsetValue)
            row.appendChild(offsetCell)

        }

        tbody.appendChild(row);
    });

    table.appendChild(tbody);

    // Add the table heading
    const tableHeading = document.createElement('h2');
    tableHeading.textContent = 'Character Data';
    tableHeading.style.marginTop = '0';
    tableWrapper.appendChild(tableHeading);

    // Add the table to the wrapper
    tableWrapper.appendChild(table);

    // --- Add New Character Button ---
    const addCharButton = document.createElement('button');
    addCharButton.id = 'addCharButton';
    addCharButton.textContent = 'Add New Character';
    addCharButton.addEventListener('click', () => {
        const charInput = prompt('Enter the new character (e.g., "A", " ", "\\n", "\\t"):');
        if (charInput !== null && charInput.length === 1) {
            if (characters.some(c => c.character === charInput)) {
                alert(`Character "${charInput}" already exists!`);
                return;
            }

            const lastChar = characters[characters.length - 1];
            const newCharData = {
                character: charInput,
                width: lastChar.width,
                rect: [...lastChar.rect],
            };
            // Ensure the offset is copied only if it exists on the lastChar
            if (hasOffsets && lastChar.offset) {
                newCharData.offset = [...lastChar.offset];
            } else if (hasOffsets) { // If table has offset column but lastChar didn't have offset
                newCharData.offset = [0,0]; // Default value for new offset
            }

            characters.push(newCharData);

            // Re-draw the entire table to reflect changes easily
            drawTable(fontData);
            imageUtil.cutFontImageToChars(mergedFontImage, characters).then(()=>{
                if (typeof fontInstance !== 'undefined' && fontRenderer) {
                    fontRenderer(fontPreviewArea).then(() => console.log(`Font rerendered`));
                }
            })

        } else if (charInput !== null) {
            alert('Please enter exactly one character.');
        }
    });
    tableWrapper.appendChild(addCharButton);

    // Add the wrapper to the container
    tablesContainer.appendChild(tableWrapper);

    // Call createKerningTable with the now guaranteed-to-exist fontData.kerning object
    createKerningTable(tablesContainer, fontUI);


    return table;
}

/**
 * Creates and displays a table of kerning pairs
 * @param {HTMLElement} container - Container element to append the table to
 * @param fontUI
 * @returns {HTMLElement} The created kerning table element
 */
function createKerningTable(container, fontUI) {
    // kerningData is now guaranteed to be an object due to the check in drawTable
    // Check if the kerning table wrapper already exists
    let kerningData = fontUI.fontInstance.fontData.kerning;
    let kerningWrapper = container.querySelector('#kerningTableWrapper');
    let table;
    let tbody;
    let fontRenderer = fontUI.fontRenderer.bind(fontUI);
    let fontPreviewArea = fontUI.fontPreviewArea;

    if (!kerningWrapper) {
        // Create a wrapper for the kerning table if it doesn't exist
        kerningWrapper = document.createElement('div');
        kerningWrapper.id = 'kerningTableWrapper'; // Add an ID for easier selection

        // Create heading for kerning table
        const heading = document.createElement('h2');
        heading.textContent = 'Kerning Pairs';
        heading.style.marginTop = '0';
        kerningWrapper.appendChild(heading);

        // Create table element
        table = document.createElement('table');
        table.id = 'kerningDataTable';

        // Create table header
        const thead = document.createElement('thead');
        thead.style.cssText = `
            background-color: #009879;
            color: white;
            text-align: left;
        `;

        const headerRow = document.createElement('tr');
        ['Pair', 'Adjustment'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            th.style.cssText = `
                padding: 12px 15px;
            `;
            headerRow.appendChild(th);
        });

        const deleteButtonRow = document.createElement('tr');
        headerRow.appendChild(deleteButtonRow);

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        tbody = document.createElement('tbody');
        table.appendChild(tbody); // Append tbody to table once

        kerningWrapper.appendChild(table); // Append table to wrapper

        // --- Add New Kerning Pair Button (only create once) ---
        const addKerningButton = document.createElement('button');
        addKerningButton.textContent = 'Add New Kerning Pair';
        addKerningButton.id = 'addKerningPairButton'; // Add an ID for easier selection
        addKerningButton.addEventListener('click', () => {
            const pairInput = prompt('Enter the new kerning pair (exactly 2 characters):');
            if (pairInput !== null) {
                if (pairInput.length === 2) {
                    if (kerningData.hasOwnProperty(pairInput)) {
                        alert(`Kerning pair "${pairInput}" already exists!`);
                        return;
                    }

                    kerningData[pairInput] = 0; // Set initial kerning value to 0

                    // --- NEW: Add only the new row ---
                    const newRow = createKerningRow(pairInput, 0, kerningData);
                    const currentTbody = document.querySelector('#kerningDataTable tbody');
                    if (currentTbody) {
                        currentTbody.appendChild(newRow);
                        // Re-apply alternating row colors after adding a new row
                        updateKerningRowColors(currentTbody);
                    }
                    // --- END NEW ---

                        fontRenderer(fontPreviewArea);

                } else {
                    alert('Kerning pair must consist of exactly 2 characters.');
                }
            }
        });
        kerningWrapper.appendChild(addKerningButton);

        container.appendChild(kerningWrapper); // Append wrapper to the main container
    } else {
        // If wrapper already exists, get that tbody and clear it for re-population
        table = kerningWrapper.querySelector('#kerningDataTable');
        tbody = table.querySelector('tbody');
        tbody.innerHTML = ''; // Clear existing rows to re-populate
    }

    // Populate (or re-populate) that tbody with existing kerning data
    Object.entries(kerningData).forEach(([pair, adjustment], index) => {
        const row = createKerningRow(pair, adjustment, fontUI, index);
        tbody.appendChild(row);
    });

    // Ensure alternating row colors are correct after the initial population
    updateKerningRowColors(tbody);

    return table;
}


// --- Helper function to create a single kerning row ---
function createKerningRow(pair, adjustment, fontUI, rowIndex = null) {
    let fontRenderer = fontUI.fontRenderer.bind(fontUI);
    let fontPreviewArea = fontUI.fontPreviewArea;
    const kerningData = fontUI.fontInstance.fontData.kerning;
    const row = document.createElement('tr');
    // Apply initial background color based on index if provided
    if (rowIndex !== null) {
        row.style.cssText = `
            border-bottom: 1px solid #dddddd;
            ${rowIndex % 2 === 0 ? 'background-color: #f3f3f3;' : ''}
        `;
    } else {
        // Default style for dynamically added rows, coloring will be corrected by updateKerningRowColors
        row.style.cssText = `border-bottom: 1px solid #dddddd;`;
    }


    // Pair cell
    let originalPair = pair;
    const pairCell = document.createElement('td');
    pairCell.style.padding = '12px 15px';
    row.appendChild(pairCell);

    const pairValueInput = document.createElement("input");
    pairValueInput.type = "text";
    pairValueInput.value = originalPair;
    pairValueInput.style.width = '100px';
    pairValueInput.addEventListener("keyup", function(event) {
        const newPair = event.target.value;

        // Always show color feedback based on length
        if (newPair.length !== 2) {
            pairValueInput.style.color = 'red';
        }
        else pairValueInput.style.color = 'black';
        // Only proceed with renaming if the value changed
        if (newPair !== originalPair) {
            if (newPair.length !== 2) {
                return;
            }


            // Rename in the kerning data
            kerningData[newPair] = kerningData[originalPair];
            delete kerningData[originalPair];
            originalPair = newPair;

            console.log("Kerning pair renamed:", originalPair, "->", newPair);
            console.dir(kerningData);
        }

        const currentAdjustmentInput = pairValueInput.parentElement.nextElementSibling.lastChild;
        kerningData[originalPair] = parseInt(currentAdjustmentInput.value); // Use originalPair here

            fontRenderer(fontPreviewArea);
    });
    pairCell.appendChild(pairValueInput);

    // Adjustment cell
    const adjustmentCell = document.createElement('td');
    adjustmentCell.style.padding = '12px 15px';
    row.appendChild(adjustmentCell);

    const adjustmentValueInput = document.createElement("input");
    adjustmentValueInput.type = "number";
    adjustmentValueInput.value = parseInt(adjustment);
    adjustmentValueInput.style.width = '60px';
    adjustmentValueInput.addEventListener("change", function(event) {
        const newAdjustment = parseInt(event.target.value);
        if (!isNaN(newAdjustment)) {
            kerningData[originalPair] = newAdjustment; // Use originalPair here
            console.log(`Adjustment for "${originalPair}" updated to: ${newAdjustment}`);
            console.dir(kerningData);
        } else {
            console.warn("Invalid adjustment value. Please enter a number.");
            event.target.value = "0";
            kerningData[originalPair] = 0; // Use originalPair here
        }
            fontRenderer(fontPreviewArea);

    });
    adjustmentCell.appendChild(adjustmentValueInput);

    // Delete button cell
    const deleteCell = document.createElement('td');
    deleteCell.style.padding = '12px 15px';
    row.appendChild(deleteCell);
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = '✖';
    deleteButton.style.cssText = `
        background-color: #f44336;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
    `;
    deleteButton.addEventListener('click', function() {
        // Remove the kerning pair from the kerningData object
        delete kerningData[originalPair];
        
        // Remove the row from the UI
        row.remove();
        
        // Update alternating row colors
        const tbody = document.querySelector('#kerningDataTable tbody');
        if (tbody) {
            updateKerningRowColors(tbody);
        }
        
        // Re-render the font
        fontRenderer(fontPreviewArea);
        
        console.log(`Kerning pair "${originalPair}" removed`);
    });
    
    deleteCell.appendChild(deleteButton);
    
    return row;
}

// --- Helper function to update alternating row colors ---
function updateKerningRowColors(tbody) {
    const rows = tbody.children;
    for (let i = 0; i < rows.length; i++) {
        if (i % 2 === 0) {
            rows[i].style.backgroundColor = '#f3f3f3';
        } else {
            rows[i].style.backgroundColor = ''; // Reset to default
        }
    }
}
// --- END Helper functions ---


// Export the drawTable function to be used in other modules
export default drawTable;