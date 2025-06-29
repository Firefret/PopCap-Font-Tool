/**
 * Creates and displays a table representation of the font data
 * @param {Object} fontData - The parsed font data object containing character information
 * @returns {HTMLElement} The created table element
 */
function drawTable(fontData) {
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
        row.appendChild(charCell);
        
        // Width cell
        const widthCell = document.createElement('td');
        widthCell.style.padding = '12px 15px';
        widthCell.textContent = char.width;
        row.appendChild(widthCell);
        
        // Rectangle cell
        const rectCell = document.createElement('td');
        rectCell.style.padding = '12px 15px';
        rectCell.textContent = char.rect.join(', ');
        row.appendChild(rectCell);
        
        // Offset cell (if applicable)
        if (hasOffsets) {
            const offsetCell = document.createElement('td');
            offsetCell.style.padding = '12px 15px';
            offsetCell.textContent = char.offset ? char.offset.join(', ') : 'N/A';
            row.appendChild(offsetCell);
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
        const pairCell = document.createElement('td');
        pairCell.style.padding = '12px 15px';
        pairCell.textContent = pair;
        row.appendChild(pairCell);
        
        // Adjustment cell
        const adjustmentCell = document.createElement('td');
        adjustmentCell.style.padding = '12px 15px';
        adjustmentCell.textContent = adjustment;
        row.appendChild(adjustmentCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    kerningWrapper.appendChild(table);
    container.appendChild(kerningWrapper);
    
    return table;
}

// Export the drawTable function to be used in other modules
export default drawTable;