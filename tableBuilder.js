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
        
        // Character cell (with special handling for space and special chars)
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

        
        // Width cell
        const widthCell = document.createElement('td');
        widthCell.style.padding = '12px 15px';
        widthCell.style.width = "fit-content";
        //widthCell.textContent = char.width;
        row.appendChild(widthCell);
        const widthValue = document.createElement("input");
        widthValue.type = "text";
        widthValue.value = char.width;
        widthValue.addEventListener("keyup", function(event) {
            setTimeout(()=>null, 0)
            fontData.characters[index].width = parseInt(event.target.value);
            console.log(fontData)
            fontInstance.fontRenderer(fontInstance.fontPreviewArea);
        })
        widthCell.appendChild(widthValue);

        
        // Rectangle cell
        const rectCell = document.createElement('td');
        rectCell.style.padding = '12px 15px';
        rectCell.style.width = "fit-content";
        row.appendChild(rectCell);
        const rectValue = document.createElement("input");
        rectValue.type = "text";
        rectValue.value = char.rect;
        rectValue.addEventListener("keyup", function(event) {
            fontData.characters[index].rect = event.target.value.split(",");
            console.log(fontData)
                fontInstance.fontRenderer(fontInstance.fontPreviewArea);

        })
        rectCell.appendChild(rectValue);
        
        // Offset cell (if applicable)
        if (hasOffsets) {
            const offsetCell = document.createElement('td');
            offsetCell.style.padding = '12px 15px';
            //offsetCell.textContent = char.offset.join(', ');
            row.appendChild(offsetCell);
            const offsetValue = document.createElement("input");
            offsetValue.type = "text";
            offsetValue.value = char.offset;
            offsetValue.addEventListener("keyup", function(event) {
                fontData.characters[index].offset = event.target.value.split(",");
                fontData.characters[index].offset.forEach((val, ind) => {
                    fontData.characters[index].offset[ind] = parseInt(val);
                })
                console.dir(fontData);

                fontInstance.fontRenderer(fontInstance.fontPreviewArea);
            })
            offsetCell.appendChild(offsetValue)

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
    
    // Add the wrapper to the container
    tablesContainer.appendChild(tableWrapper);
    
    // If there's kerning data, create a kerning table
    if (fontData.kerning && Object.keys(fontData.kerning).length > 0) {
        createKerningTable(fontData.kerning, tablesContainer);
    }
    
    return table;
}

/**
 * Creates and displays a table of kerning pairs
 * @param {Object} kerningData - Object with kerning pairs as keys and values as adjustments
 * @param {HTMLElement} container - Container element to append the table to
 * @returns {HTMLElement} The created kerning table element
 */
function createKerningTable(kerningData, container) {
    if (!kerningData || Object.keys(kerningData).length === 0) {
        return null;
    }
    
    // Create a wrapper for the kerning table
    const kerningWrapper = document.createElement('div');
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
    const table = document.createElement('table');
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
    const tbody = document.createElement('tbody');
    Object.entries(kerningData).forEach(([pair, adjustment], index) => {
        const row = document.createElement('tr');
        row.style.cssText = `
            border-bottom: 1px solid #dddddd;
            ${index % 2 === 0 ? 'background-color: #f3f3f3;' : ''}
        `;
        
        // Pair cell
        let originalPair = pair;

// Pair cell
        const pairCell = document.createElement('td');
        pairCell.style.padding = '12px 15px';
        row.appendChild(pairCell);

        const pairValueInput = document.createElement("input");
        pairValueInput.type = "text";
        pairValueInput.value = originalPair; // Initialize with the original pair
        pairValueInput.style.width = '100px'; // Example styling
        pairValueInput.addEventListener("keyup", function(event) { // Use 'change' for better UX after input is finalized
            const newPair = event.target.value;

            // Only proceed if the new pair is different and not empty
            if (newPair !== originalPair && newPair.trim() !== '') {
                // Check if the new pair already exists to avoid overwriting
                if (kerningData.hasOwnProperty(newPair)) {
                    console.warn(`Kerning pair "${newPair}" already exists. Cannot rename.`);
                    // Optionally, revert the input value or show an error message to the user
                    event.target.value = originalPair;
                    return;
                }

                // Get the current adjustment value associated with the original pair
                // Add the new pair with the old adjustment
                kerningData[newPair] = kerningData[originalPair];

                // Delete the old pair
                delete kerningData[originalPair];

                // IMPORTANT: Update the 'originalPair' variable in the closure
                // so subsequent changes to adjustmentValueInput correctly reference the new key.
                // This is crucial if you're not re-rendering the entire row.
                // For a full React-like component, you'd typically re-render the row.
                // For simple DOM manipulation, this update is necessary.
                pair = newPair; // Update the 'pair' variable in the outer scope if it's used elsewhere
                originalPair = newPair; // Update the local 'originalPair' for this closure

                console.log("Kerning pair renamed:", originalPair, "->", newPair);
                console.dir(kerningData);
            } else if (newPair.trim() === '') {
                console.warn("Kerning pair cannot be empty. Reverting to original.");
                event.target.value = originalPair;
            }
            if(event.target.value.length !== 2){
                delete kerningData[pair];
            }
            kerningData[pair] = parseInt(pairValueInput.parentElement.nextElementSibling.lastChild.value);
            fontInstance.serializeFontData()
            console.dir(kerningData);
        });
        pairCell.appendChild(pairValueInput);

// Adjustment cell
        const adjustmentCell = document.createElement('td');
        adjustmentCell.style.padding = '12px 15px';
        row.appendChild(adjustmentCell);

        const adjustmentValueInput = document.createElement("input");
        adjustmentValueInput.type = "number"; // Use type="number" for numerical input
        adjustmentValueInput.value = parseInt(adjustment);
        adjustmentValueInput.style.width = '60px'; // Example styling
        adjustmentValueInput.addEventListener("keyup", function(event) { // Use 'change' for better UX
            const newAdjustment = parseInt(event.target.value);
            if (!isNaN(newAdjustment)) {
                // Use the 'pair' variable that was potentially updated by pairValueInput's change listener
                kerningData[pair] = newAdjustment;
                console.log(`Adjustment for "${pair}" updated to: ${newAdjustment}`);
                console.dir(kerningData);
            } else {
                console.warn("Invalid adjustment value. Please enter a number.");
                event.target.value = ""; // Revert to last valid value
                kerningData[pair] = 0;
            }
            fontInstance.serializeFontData()
            console.dir(kerningData);

        });
        adjustmentCell.appendChild(adjustmentValueInput);

        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    kerningWrapper.appendChild(table);
    container.appendChild(kerningWrapper);
    
    return table;
}

// Export the drawTable function to be used in other modules
export default drawTable;