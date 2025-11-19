// ====================================================================
// CONFIGURAZIONE
// ====================================================================

const FOLDER_ID = '1u3oZ-4XAOGEz5ygGEyb6fQrWnQ17sCjE'; 
// Chiave API precedente (La ricerca fullText ricorsiva fallirà ancora con 403, 
// ma il caricamento della struttura dovrebbe funzionare.)
const API_KEY = 'AIzaSyC0sxsoNUPZIUpkqicVSzWXjCQd7D1gqfs'; 

// Array per tenere traccia degli ID dei file PDF attualmente selezionati.
const selectedFiles = [];


// ====================================================================
// FUNZIONI DI BASE (Mantengo le stesse per l'interfaccia)
// ====================================================================

/**
 * Aggiorna il viewer PDF rimuovendo o aggiungendo l'iframe del file selezionato.
 */
function updateViewer() {
    const viewerElement = document.getElementById('pdf-viewer');
    viewerElement.innerHTML = '';
    
    if (selectedFiles.length === 0) {
        viewerElement.innerHTML = '<p>Seleziona uno o più file PDF per visualizzarli qui.</p>';
        return;
    }

    selectedFiles.forEach(fileData => {
        const embedUrl = `https://drive.google.com/file/d/${fileData.id}/preview`;
        
        const pdfContainer = document.createElement('div');
        pdfContainer.classList.add('pdf-document-container');
        
        const titleHeader = document.createElement('h3');
        titleHeader.textContent = fileData.name;
        pdfContainer.appendChild(titleHeader);
        
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.width = "100%";
        iframe.height = "600px";
        iframe.frameborder = "0";
        
        pdfContainer.appendChild(iframe);
        viewerElement.appendChild(pdfContainer);
    });
}

/**
 * Gestisce la selezione/deselezione di un file PDF.
 */
function handleFileCheckboxChange(fileId, fileName, isChecked) {
    const fileIndex = selectedFiles.findIndex(f => f.id === fileId);

    if (isChecked) {
        if (fileIndex === -1) {
            selectedFiles.push({ id: fileId, name: fileName });
        }
    } else {
        if (fileIndex > -1) {
            selectedFiles.splice(fileIndex, 1);
        }
    }
    
    const fileCheckbox = document.getElementById(`pdf-file-${fileId}`);
    if (fileCheckbox && fileCheckbox.closest('.document-column')) {
        updateColumnCheckboxStatus(fileId);
    }
    
    updateViewer();
}

/**
 * Aggiorna lo stato della checkbox della colonna.
 */
function updateColumnCheckboxStatus(fileId) {
    const fileCheckbox = document.getElementById(`pdf-file-${fileId}`);
    if (!fileCheckbox) return;
    
    const columnDiv = fileCheckbox.closest('.document-column');
    if (!columnDiv) return;

    const columnId = columnDiv.dataset.folderId;
    const columnCheckbox = document.getElementById(`col-${columnId}`);
    
    const allFiles = columnDiv.querySelectorAll('input[type="checkbox"]:not(.column-checkbox)');
    const checkedFiles = columnDiv.querySelectorAll('input[type="checkbox"]:checked:not(.column-checkbox)');

    if (checkedFiles.length === allFiles.length) {
        columnCheckbox.checked = true;
        columnCheckbox.indeterminate = false;
    } else if (checkedFiles.length > 0) {
        columnCheckbox.checked = false;
        columnCheckbox.indeterminate = true;
    } else {
        columnCheckbox.checked = false;
        columnCheckbox.indeterminate = false;
    }
}

/**
 * Seleziona/deseleziona tutte le checkbox sotto una specifica colonna.
 */
function handleColumnCheckboxChange(columnId, isChecked) {
    const columnDiv = document.querySelector(`.document-column[data-folder-id="${columnId}"]`);
    if (!columnDiv) return;

    const fileCheckboxes = columnDiv.querySelectorAll('input[type="checkbox"]:not(.column-checkbox)');
    
    fileCheckboxes.forEach(checkbox => {
        if (checkbox.checked !== isChecked) {
            checkbox.checked = isChecked;
            handleFileCheckboxChange(checkbox.id.replace('pdf-file-', ''), checkbox.name, isChecked);
        }
    });

    const columnCheckbox = document.getElementById(`col-${columnId}`);
    if (columnCheckbox) {
        columnCheckbox.indeterminate = false;
    }
}

// ====================================================================
// GESTIONE CONTROLLI GLOBALI
// ====================================================================

function selectAll(isChecked) {
    // Gestione colonne
    const allColumnCheckboxes = document.querySelectorAll('input[type="checkbox"].column-checkbox');
    allColumnCheckboxes.forEach(columnCheckbox => {
        const columnId = columnCheckbox.id.replace('col-', '');
        if (columnCheckbox.checked !== isChecked) {
             columnCheckbox.checked = isChecked;
             handleColumnCheckboxChange(columnId, isChecked);
        }
    });

    // Gestione risultati ricerca
    const allSearchCheckboxes = document.querySelectorAll('#search-results input[type="checkbox"]');
    allSearchCheckboxes.forEach(checkbox => {
         if (checkbox.checked !== isChecked) {
             checkbox.checked = isChecked;
             handleFileCheckboxChange(checkbox.id.replace('pdf-file-', ''), checkbox.name, isChecked);
         }
    });
    
    if (!isChecked) {
        selectedFiles.length = 0;
    }

    updateViewer();
}

function setupGlobalControls() {
    document.getElementById('seleziona-tutto').addEventListener('click', () => selectAll(true));
    document.getElementById('deseleziona-tutto').addEventListener('click', () => selectAll(false));
}


// ====================================================================
// FUNZIONI DI RICERCA (RIPRISTINATA)
// ====================================================================

/**
 * Renderizza i risultati della ricerca in una singola colonna.
 */
function renderSearchResults(results, containerElement, query) {
    containerElement.innerHTML = '';
    
    if (results.length === 0) {
        containerElement.innerHTML = `<p>Nessun documento trovato per la ricerca: <strong>${query}</strong>.</p>`;
        return;
    }

    const searchColumn = document.createElement('div');
    searchColumn.id = 'search-results';
    searchColumn.classList.add('document-column');
    searchColumn.innerHTML = `<h2>Risultati per "${query}"</h2>`;
    
    const ul = document.createElement('ul');
    results.sort((a, b) => a.name.localeCompare(b.name));

    results.forEach(item => {
        const li = document.createElement('li');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `pdf-file-${item.id}`; 
        checkbox.name = item.name;
        
        const isSelected = selectedFiles.some(f => f.id === item.id);
        checkbox.checked = isSelected;
        
        checkbox.onchange = (e) => handleFileCheckboxChange(item.id, item.name, e.target.checked);

        const label = document.createElement('label');
        label.htmlFor = `pdf-file-${item.id}`;
        label.textContent = item.name;

        li.appendChild(checkbox);
        li.appendChild(label);
        ul.appendChild(li);
    });

    searchColumn.appendChild(ul);
    containerElement.appendChild(searchColumn);
}

/**
 * Passa dalla vista colonne alla vista ricerca e viceversa.
 */
function toggleSearchView(isSearching) {
    const resetButton = document.getElementById('reset-button');
    const selectAllButton = document.getElementById('seleziona-tutto');
    const deselectAllButton = document.getElementById('deseleziona-tutto');

    if (isSearching) {
        resetButton.style.display = 'inline-block';
        selectAllButton.style.display = 'none';
        deselectAllButton.style.display = 'none';
    } else {
        resetButton.style.display = 'none';
        selectAllButton.style.display = 'inline-block';
        deselectAllButton.style.
