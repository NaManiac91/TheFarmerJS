const objects = [
    'seedling.svg',
    'wood.svg',
    'rock.svg'
]

// Create the grid in the DOM and fill the grid with random items
export function initGrid(gridValues, n) {
    const grid = document.createElement('div');
    grid.id = 'grid';

    for (let i = 0; i < n; i++) {
        let row = document.createElement('div');
        row.className = 'row';
        grid.append(row);
        for (let j = 0; j < n; j++) {
            // Create cell
            let cell = document.createElement('div');
            cell.className = 'cell cell-' + i + '-' + j;

            // Append a random object in the cell
            let img = document.createElement('img');
            let value = Math.floor(Math.random() * objects.length);
            img.src = 'assets/' + objects[value];
            cell.appendChild(img);
            gridValues[i][j] = value;

            // Append to the row
            row.append(cell);
        }
    }
    return grid;
}

export function move(event, row, col, farmer, grid, n) {
    const currentPosition = grid.getElementsByClassName('cell-' + row + '-' + col)[0];
    currentPosition.children[0].style.display = 'block';    // show the object "behind" the farmer

    switch (event.keyCode) {
        case 37:    // left
            col -= 1;
            break;
        case 38:    // top
            row -= 1;
            break;
        case 39:    // right
            col += 1;
            break;
        case 40:    // bottom
            row += 1;
            break;
    }

    // Moving the farmer if the movement is allowed
    if (col < n && col >= 0 && row >= 0 && row < n) {
        const newPosition = grid.getElementsByClassName('cell-' + row + '-' + col)[0];
        newPosition.children[0].style.display = 'none';
        newPosition.appendChild(farmer);
    }
}

export function action(row, col, grid, gridValues) {
    const position = grid.getElementsByClassName('cell-' + row + '-' + col)[0];

    // Update the currentValue
    let currentValue = gridValues[row][col];
    if (currentValue >= 0) {
        currentValue = currentValue - 1;
    }

    // Hide or change the img of the object
    if (position.firstChild) {
        if (currentValue < 0) {
            position.firstChild.src = '';
            position.children[0].style.display = 'none';
        } else {
            position.firstChild.src = 'assets/' + objects[currentValue];
        }
    }

    gridValues[row][col] = currentValue;    // Update the value in the grid
}