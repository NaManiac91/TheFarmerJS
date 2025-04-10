const objects = [
    'seedling.svg',
    'wood.svg',
    'rock.svg'
]

// Create the grid in the DOM and fill the grid with random items
export function initGrid(n) {
    const grid = document.createElement('div');
    grid.id = 'grid';
    let points = 0;

    for (let i = 0; i < n; i++) {
        let row = document.createElement('div');
        row.className = 'row';
        grid.append(row);
        for (let j = 0; j < n; j++) {
            // Create cell
            let cell = document.createElement('div');
            cell.className = 'cell cell-' + i + '-' + j;

            // Append a random object in the cell
            const img = document.createElement('img');
            const value = Math.floor(Math.random() * objects.length);
            img.src = 'assets/' + objects[value];
            cell.appendChild(img);
            cell.setAttribute('value', value);
            points += value + 1;

            // Append to the row
            row.append(cell);
        }
    }

    grid.setAttribute('points', points);
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

export function action(row, col, grid, points) {
    const cell = grid.getElementsByClassName('cell-' + row + '-' + col)[0];

    // Update the currentValue
    let currentValue = cell.getAttribute('value');
    if (currentValue >= 0) {
        currentValue = currentValue - 1;

        const value = Number(points.getAttribute('value')) + 1;
        const current = Number(points.getAttribute('current')) + 1;
        points.setAttribute('value', value);
        points.setAttribute('current', current);
        points.innerText = `Points: ${value}`;
    }

    // Hide or change the img of the object
    if (cell.firstChild) {
        if (currentValue < 0) {
            cell.firstChild.src = '';
            cell.children[0].style.display = 'none';
        } else {
            cell.firstChild.src = 'assets/' + objects[currentValue];
        }
    }

    cell.setAttribute('value', currentValue);
}

export function createFarmer(grid) {
    const farmer = document.createElement('img');
    farmer.id = 'farmer';
    farmer.src = 'assets/farmer.svg';
    farmer.height = 25;
    const firstCell = grid.getElementsByClassName('cell-0-0')[0];
    firstCell.children[0].style.display = 'none';
    firstCell.appendChild(farmer);

    return farmer;
}