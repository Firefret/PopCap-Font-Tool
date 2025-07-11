/**
 * Creates and displays a table representation of the font data
 * @param {Object} fontData - The parsed font data object containing character information
 * @returns {HTMLElement} The created table element
 */
let fontGlobal;
function drawTable(fontData) {
    fontGlobal = fontData;
    if (!fontData || !fontData.characters || fontData.characters.length === 0) {
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
    tablesContainer.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        margin: 20px 0;
    `;
    document.body.appendChild(tablesContainer);

    // Create a wrapper for the characters table
    const tableWrapper = document.createElement('div');
    tableWrapper.style.cssText = `
        flex: 1;
        min-width: 300px;
        max-width: 600px;
    `;

    // Create table element
    const table = document.createElement('table');
    table.id = 'fontDataTable';
    table.style.cssText = `
        border-collapse: collapse;
        font-family: Arial, sans-serif;
        width: 100%;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
    `;

    // Create table header
    const thead = document.createElement('thead');
    thead.style.cssText = `
        background-color: #009879;
        color: white;
        text-align: left;
    `;

    const headerRow = document.createElement('tr');
    const headers = ['Character', 'Width', 'Rectangle (x, y, w, h)'];

    // Add Offset header if any character has offset data
    const hasOffsets = fontData.characters.some(char => char.offset);
    if (hasOffsets) {
        headers.push('Offset (x, y)');
    }

    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        th.style.cssText = `
            padding: 12px 15px;
        `;
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

        // 1. Character cell
        const charCell = document.createElement('td');
        charCell.style.padding = '12px 15px';
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
        widthCell.style.padding = '12px 15px';
        widthCell.style.width = "fit-content";
        const widthValue = document.createElement("input");
        widthValue.type = "text";
        widthValue.value = char.width;
        widthValue.addEventListener("keyup", function(event) {
            setTimeout(()=>null, 0)
            fontData.characters[index].width = parseInt(event.target.value);
            console.log(fontData)
            if (typeof fontInstance !== 'undefined' && fontInstance.fontRenderer) {
                fontInstance.fontRenderer(fontInstance.fontPreviewArea);
            }
        })
        widthCell.appendChild(widthValue);
        row.appendChild(widthCell);


        // 3. Rectangle cell
        const rectCell = document.createElement('td');
        rectCell.style.padding = '12px 15px';
        rectCell.style.width = "fit-content";
        const rectValue = document.createElement("input");
        rectValue.type = "text";
        rectValue.value = char.rect.join(', '); // Join array elements for display
        rectValue.addEventListener("keyup", function(event) {
            fontData.characters[index].rect = event.target.value.split(",").map(Number); // Ensure numbers
            console.log(fontData)
            if (typeof fontInstance !== 'undefined' && fontInstance.fontRenderer) {
                fontInstance.fontRenderer(fontInstance.fontPreviewArea);
            }
        })
        rectCell.appendChild(rectValue);
        row.appendChild(rectCell);

        // 4. Offset cell (if applicable)
        if (hasOffsets) {
            const offsetCell = document.createElement('td');
            offsetCell.style.padding = '12px 15px';
            const offsetValue = document.createElement("input");
            offsetValue.type = "text";
            offsetValue.value = char.offset ? char.offset.join(', ') : ''; // Handle undefined offset, join array
            offsetValue.addEventListener("keyup", function(event) {
                fontData.characters[index].offset = event.target.value.split(",").map(Number); // Ensure numbers
                console.dir(fontData);

                if (typeof fontInstance !== 'undefined' && fontInstance.fontRenderer) {
                    fontInstance.fontRenderer(fontInstance.fontPreviewArea);
                }
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
    addCharButton.textContent = 'Add New Character';
    addCharButton.style.cssText = `
        margin-top: 10px;
        padding: 8px 15px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        float: right;
    `;
    addCharButton.addEventListener('click', () => {
        const charInput = prompt('Enter the new character (e.g., "A", " ", "\\n", "\\t"):');
        if (charInput !== null && charInput.length === 1) {
            if (fontData.characters.some(c => c.character === charInput)) {
                alert(`Character "${charInput}" already exists!`);
                return;
            }

            const lastChar = fontData.characters[fontData.characters.length - 1];
            const newCharData = {
                character: charInput,
                width: lastChar.width,
                rect: [...lastChar.rect],
            };
            // Ensure offset is copied only if it exists on the lastChar
            if (hasOffsets && lastChar.offset) {
                newCharData.offset = [...lastChar.offset];
            } else if (hasOffsets) { // If table has offset column but lastChar didn't have offset
                newCharData.offset = [0,0]; // Default value for new offset
            }

            fontData.characters.push(newCharData);

            // Re-draw the entire table to reflect changes easily
            drawTable(fontData);

            if (typeof fontInstance !== 'undefined' && fontInstance.fontRenderer && fontInstance.serializeFontData) {
                fontInstance.serializeFontData();
                fontInstance.fontRenderer(fontInstance.fontPreviewArea);
            }
        } else if (charInput !== null) {
            alert('Please enter exactly one character.');
        }
    });
    tableWrapper.appendChild(addCharButton);

    // Add the wrapper to the container
    tablesContainer.appendChild(tableWrapper);

    // Call createKerningTable with the now guaranteed-to-exist fontData.kerning object
    createKerningTable(fontData.kerning, tablesContainer);


    return table;
}

/**
 * Creates and displays a table of kerning pairs
 * @param {Object} kerningData - Object with kerning pairs as keys and values as adjustments
 * @param {HTMLElement} container - Container element to append the table to
 * @returns {HTMLElement} The created kerning table element
 */
function createKerningTable(kerningData, container) {
    // kerningData is now guaranteed to be an object due to the check in drawTable

    // Check if the kerning table wrapper already exists
    let kerningWrapper = container.querySelector('#kerningTableWrapper');
    let table;
    let tbody;

    if (!kerningWrapper) {
        // Create a wrapper for the kerning table if it doesn't exist
        kerningWrapper = document.createElement('div');
        kerningWrapper.id = 'kerningTableWrapper'; // Add an ID for easier selection
        kerningWrapper.style.cssText = `
            flex: 1;
            min-width: 250px;
            max-width: 400px;
            margin-left: 150px;
        `;

        // Create heading for kerning table
        const heading = document.createElement('h2');
        heading.textContent = 'Kerning Pairs';
        heading.style.marginTop = '0';
        kerningWrapper.appendChild(heading);

        // Create table element
        table = document.createElement('table');
        table.id = 'kerningDataTable';
        table.style.cssText = `
            border-collapse: collapse;
            font-family: Arial, sans-serif;
            width: 100%;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
        `;

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
        addKerningButton.style.cssText = `
            margin-top: 10px;
            padding: 8px 15px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            float: right;
        `;
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

                    if (typeof fontInstance !== 'undefined' && fontInstance.serializeFontData) {
                        fontInstance.serializeFontData();
                    }
                    if (typeof fontInstance !== 'undefined' && fontInstance.fontRenderer) {
                        fontInstance.fontRenderer(fontInstance.fontPreviewArea);
                    }
                } else {
                    alert('Kerning pair must consist of exactly 2 characters.');
                }
            }
        });
        kerningWrapper.appendChild(addKerningButton);

        container.appendChild(kerningWrapper); // Append wrapper to main container
    } else {
        // If wrapper already exists, just get the tbody and clear it for re-population
        table = kerningWrapper.querySelector('#kerningDataTable');
        tbody = table.querySelector('tbody');
        tbody.innerHTML = ''; // Clear existing rows to re-populate
    }

    // Populate (or re-populate) the tbody with existing kerning data
    Object.entries(kerningData).forEach(([pair, adjustment], index) => {
        const row = createKerningRow(pair, adjustment, kerningData, index);
        tbody.appendChild(row);
    });

    // Ensure alternating row colors are correct after initial population
    updateKerningRowColors(tbody);

    return table;
}


// --- Helper function to create a single kerning row ---
function createKerningRow(pair, adjustment, kerningData, rowIndex = null) {
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

        if (newPair !== originalPair) {
            if (newPair.length !== 2) {
                alert('Kerning pair must consist of exactly 2 characters.');
                event.target.value = originalPair;
                return;
            }

            if (kerningData.hasOwnProperty(newPair)) {
                alert(`Kerning pair "${newPair}" already exists! Cannot rename.`);
                event.target.value = originalPair;
                return;
            }

            kerningData[newPair] = kerningData[originalPair];
            delete kerningData[originalPair];

            originalPair = newPair; // Update originalPair for future edits in this row

            console.log("Kerning pair renamed:", originalPair, "->", newPair);
            console.dir(kerningData);
        }

        const currentAdjustmentInput = pairValueInput.parentElement.nextElementSibling.lastChild;
        kerningData[originalPair] = parseInt(currentAdjustmentInput.value); // Use originalPair here

        if (typeof fontInstance !== 'undefined' && fontInstance.serializeFontData) {
            fontInstance.serializeFontData();
        }
        if (typeof fontInstance !== 'undefined' && fontInstance.fontRenderer) {
            fontInstance.fontRenderer(fontInstance.fontPreviewArea);
        }
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
        if (typeof fontInstance !== 'undefined' && fontInstance.serializeFontData) {
            fontInstance.serializeFontData();
        }
        if (typeof fontInstance !== 'undefined' && fontInstance.fontRenderer) {
            fontInstance.fontRenderer(fontInstance.fontPreviewArea);
        }
    });
    adjustmentCell.appendChild(adjustmentValueInput);

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