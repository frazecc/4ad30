// ====================================================================
// CONFIGURAZIONE
// ====================================================================

const FOLDER_ID = '1u3oZ-4XAOGEz5ygGEyb6fQrWnQ17sCjE'; 
const API_KEY = 'AIzaSyC0sxsoNUPZIUpkqicVSzWXjCQd7D1gqfs'; 

// Array per tenere traccia degli ID dei file PDF attualmente selezionati, 
// l'ordine in questo array definisce l'ordine di visualizzazione.
const selectedFiles = [];


// ====================================================================
// FUNZIONI DI ORDINAMENTO E DRAG & DROP
// ====================================================================

/**
 * Aggiorna la lista visiva nella barra di controllo ordine.
 */
function updateOrderList() {
    const orderList = document.getElementById('order-list');
    orderList.innerHTML = '';

    if (selectedFiles.length === 0) {
        orderList.innerHTML = '<li>Nessun file selezionato.</li>';
        return;
    }

    selectedFiles.forEach(fileData => {
        const listItem = document.createElement('li');
        listItem.textContent = fileData.name;
        listItem.dataset.id = fileData.id;
        listItem.draggable = true; // Rende l'elemento trascinabile
        orderList.appendChild(listItem);
    });
}

/**
 * Inizializza la logica di trascinamento (Drag and Drop) sulla lista di ordinamento.
 */
function initializeDragAndDrop() {
    const orderList = document.getElementById('order-list');
    let draggedItem = null;

    orderList.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'LI') {
            draggedItem = e.target;
            e.dataTransfer.effectAllowed = 'move';
            // Aggiunge una classe per l'effetto visivo durante il trascinamento
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });

    orderList.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessario per permettere il drop
        const target = e.target;
        if (target.tagName === 'LI' && target !== draggedItem) {
            const rect = target.getBoundingClientRect();
            const next = (e.clientY - rect.top) / rect.height > 0.5;
            orderList.insertBefore(draggedItem, next ? target.nextSibling : target);
        }
    });

    orderList.addEventListener('dragend', (e) => {
        e.target.classList.remove('dragging');
        
        // Aggiorna l'array selectedFiles in base al nuovo ordine DOM
        const newOrder = Array.from(orderList.children).map(li => li.dataset.id);
        
        // Mappa l'array selectedFiles per mantenere l'oggetto completo
        const reorderedFiles = newOrder.map(id => selectedFiles.find(f => f.id === id));
        
        // Svuota e ripopola l'array globale per riflettere il nuovo ordine
        selectedFiles.length = 0;
        selectedFiles.push(...reorderedFiles);

        updateViewer();
        draggedItem = null;
    });
}


// ====================================================================
// FUNZIONI DI BASE 
// ====================================================================

/**
 * Aggiorna il viewer PDF rimuovendo o aggiungendo l'iframe del file selezionato.
 * L'ordine è determinato dall'array selectedFiles.
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
    
    // Ridisegna la lista di ordinamento dopo aver aggiornato il viewer.
    updateOrderList();
}

/**
 * Gestisce la selezione/deselezione di un file PDF.
 */
function handleFileCheckboxChange(fileId, fileName, isChecked) {
    const fileIndex = selectedFiles.findIndex(f => f.id === fileId);
    const fileData = { id: fileId, name: fileName };

    if (isChecked) {
        if (fileIndex === -1) {
            // Aggiunge il nuovo file alla fine
            selectedFiles.push(fileData);
        }
    } else {
        if (fileIndex > -1) {
            // Rimuove il file
            selectedFiles.splice(fileIndex, 1);
        }
    }
    
    // Aggiorna lo stato della checkbox
    const fileCheckbox = document.getElementById(`pdf-file-${fileId}`);
    if (fileCheckbox && fileCheckbox.closest('.document-column')) {
        updateColumnCheckboxStatus(fileId);
    }
    
    updateViewer();
}

/**
 * Aggiorna lo stato della checkbox della colonna. (funzione lasciata invariata)
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
 * Seleziona/deseleziona tutte le checkbox sotto una specifica colonna. (funzione lasciata invariata)
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
    // Gestione colonne (seleziona/deseleziona tutto)
    const allColumnCheckboxes = document.querySelectorAll('input[type="checkbox"].column-checkbox');
    allColumnCheckboxes.forEach(columnCheckbox => {
        const columnId = columnCheckbox.id.replace('col-', '');
        if (columnCheckbox.checked !== isChecked) {
             columnCheckbox.checked = isChecked;
             handleColumnCheckboxChange(columnId, isChecked);
        }
    });
    
    // Se isChecked è false, l'array selectedFiles è già stato azzerato da handleFileCheckboxChange
    // Se è true, l'array è riempito in ordine di apparizione nel DOM dalle chiamate precedenti.

    updateViewer();
}

function setupGlobalControls() {
    document.getElementById('seleziona-tutto').addEventListener('click', () => selectAll(true));
    document.getElementById('deseleziona-tutto').addEventListener('click', () => selectAll(false));
}


// ====================================================================
// FUNZIONI DI CARICAMENTO DRIVE (NON MODIFICATE)
// ====================================================================

/**
 * Costruisce la lista HTML dei file PDF e cartelle annidate per un dato parentId.
 */
function renderFolderContents(parentId, targetElement) {
    const url = `https://www.googleapis.com/drive/v3/files?q='${parentId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,parents)&key=${API_KEY}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                targetElement.innerHTML += `<p style="color:red; font-size: 0.8em;">Errore nel caricamento dei contenuti: ${data.error.message}</p>`;
                return;
            }
            
            const children = data.files || [];
            
            children.sort((a, b) => {
                const isFolderA = a.mimeType === 'application/vnd.google-apps.folder';
                const isFolderB = b.mimeType === 'application/vnd.google-apps.folder';

                if (isFolderA && !isFolderB) return -1;
                if (!isFolderA && isFolderB) return 1;
                return a.name.localeCompare(b.name);
            });

            const ul = document.createElement('ul');
            
            children.forEach(item => {
                const li = document.createElement('li');
                
                const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
                
                if (!isFolder) {
                    if (item.mimeType === 'application/pdf') {
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.id = `pdf-file-${item.id}`; 
                        checkbox.name = item.name;
                        
                        checkbox.checked = selectedFiles.some(f => f.id === item.id);
                        
                        checkbox.onchange = (e) => handleFileCheckboxChange(item.id, item.name, e.target.checked);

                        const label = document.createElement('label');
                        label.htmlFor = `pdf-file-${item.id}`;
                        label.textContent = item.name;

                        li.appendChild(checkbox);
                        li.appendChild(label);
                        ul.appendChild(li);
                    }
                } else {
                    li.innerHTML = `<strong>${item.name}</strong>`;
                    li.classList.add('sub-folder-title');
                    ul.appendChild(li);
                    
                    renderFolderContents(item.id, li);
                }
            });
            
            if (ul.children.length > 0) {
                targetElement.appendChild(ul);
            }
            
            const mainColumnDiv = targetElement.closest('.document-column');
            if(mainColumnDiv) {
                 updateColumnCheckboxStatus(mainColumnDiv.dataset.folderId);
            }
        })
        .catch(error => {
            console.error('Errore durante la connessione ai contenuti:', error);
        });
}


function listFilesInFolder() {
    const columnsContainer = document.getElementById('colonne-drive');
    
    columnsContainer.innerHTML = '<p>Caricamento struttura Drive...</p>';
    
    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name,mimeType,parents)&key=${API_KEY}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                columnsContainer.innerHTML = `<p style="color:red;">Errore API: ${data.error.message}. Verifica permessi Drive.</p>`;
                console.error('API Error:', data.error);
                return;
            }
            
            columnsContainer.innerHTML = '';
            const mainFolders = data.files || [];
            
            mainFolders.sort((a, b) => a.name.localeCompare(b.name));

            mainFolders.forEach(folder => {
                const columnDiv = document.createElement('div');
                columnDiv.classList.add('document-column');
                columnDiv.dataset.folderId = folder.id;

                const colCheckbox = document.createElement('input');
                colCheckbox.type = 'checkbox';
                colCheckbox.id = `col-${folder.id}`;
                colCheckbox.classList.add('column-checkbox');
                colCheckbox.onchange = (e) => handleColumnCheckboxChange(folder.id, e.target.checked);

                const titleHeader = document.createElement('h2');
                titleHeader.textContent = folder.name;
                
                const headerContainer = document.createElement('div');
                headerContainer.classList.add('column-header');
                headerContainer.appendChild(colCheckbox);
                headerContainer.appendChild(titleHeader);

                columnDiv.appendChild(headerContainer);

                renderFolderContents(folder.id, columnDiv);
                
                columnsContainer.appendChild(columnDiv);
            });
            
             if (mainFolders.length === 0) {
                 columnsContainer.innerHTML = '<p>Nessuna sottocartella principale trovata.</p>';
             }
             
             setupGlobalControls();
             updateViewer();
        }) 
        .catch(error => { 
            console.error('Errore durante la connessione iniziale all\'API:', error);
            columnsContainer.innerHTML = '<p style="color:red;">Impossibile connettersi a Google Drive.</p>';
        }); 
} 

document.addEventListener('DOMContentLoaded', () => {
    // Inizializza la vista
    listFilesInFolder();
    // Inizializza la logica di Drag & Drop
    initializeDragAndDrop();
});
