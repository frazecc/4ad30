// ====================================================================
// CONFIGURAZIONE
// ====================================================================

const FOLDER_ID = '1u3oZ-4XAOGEz5ygGEyb6fQrWnQ17sCjE'; 
const API_KEY = 'AIzaSyC0sxsoNUPZIUpkqicVSzWXjCQd7D1gqfs'; 

const selectedFiles = [];
let mainSubfolderIDs = []; 


// ====================================================================
// FUNZIONI DI BASE
// ====================================================================

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
    const allColumnCheckboxes = document.querySelectorAll('input[type="checkbox"].column-checkbox');
    allColumnCheckboxes.forEach(columnCheckbox => {
        const columnId = columnCheckbox.id.replace('col-', '');
        if (columnCheckbox.checked !== isChecked) {
             columnCheckbox.checked = isChecked;
             handleColumnCheckboxChange(columnId, isChecked);
        }
    });

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
// FUNZIONI DI RICERCA CONTENUTO
// ====================================================================

function searchPdfContent() {
    const query = document.getElementById('search-input').value.trim();
    const columnsContainer = document.getElementById('colonne-drive');
    
    if (!query) {
        alert('Inserisci un termine di ricerca valido.');
        return;
    }
    
    if (mainSubfolderIDs.length === 0) {
        // Tentiamo la ricerca anche se l'array è vuoto, includendo solo la FOLDER_ID
        // Ma prima tentiamo di ricaricare la struttura per popolare l'array
        listFilesInFolder(true); // Tentativo di ricarico silenzioso
        if (mainSubfolderIDs.length === 0) {
            columnsContainer.innerHTML = `<p style="color: red;">Errore: La struttura della cartella non è stata caricata.</p>`;
            return;
        }
    }
    
    toggleSearchView(true); // Passa alla vista Ricerca
    columnsContainer.innerHTML = `<p>Ricerca di "${query}" in corso...</p>`;
    
    const encodedQuery = encodeURIComponent(query);
    
    // Costruisce la clausola OR per includere la cartella madre e tutte le sue sottocartelle principali.
    const parentClauses = mainSubfolderIDs.map(id => `'${id}' in parents`).join(' or ');
    const allParentsClause = `(${parentClauses} or '${FOLDER_ID}' in parents)`;
    
    const url = `https://www.googleapis.com/drive/v3/files?q=fullText contains '${encodedQuery}' and mimeType='application/pdf' and trashed=false and ${allParentsClause}&fields=files(id,name,mimeType,parents)&key=${API_KEY}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                columnsContainer.innerHTML = `<p style="color:red;">Errore API Ricerca: ${data.error.message}. <br><strong>Verifica che TUTTI i file PDF, anche quelli annidati, siano condivisi come 'Chiunque abbia il link'.</strong></p>`;
                console.error('Search API Error:', data.error);
                return;
            }
            
            const results = data.files || [];
            
            renderSearchResults(results, columnsContainer, query);
        })
        .catch(error => {
            console.error('Errore durante la ricerca:', error);
            // Questo è l'errore che vedi in questo momento
            columnsContainer.innerHTML = '<p style="color:red;">Impossibile eseguire la ricerca.</p>'; 
        });
}

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
        deselectAllButton.style.display = 'inline-block';
        listFilesInFolder(); 
    }
}

function setupSearchControls() {
    document.getElementById('search-button').addEventListener('click', searchPdfContent);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchPdfContent();
        }
    });
    document.getElementById('reset-button').addEventListener('click', () => toggleSearchView(false));
}


// ====================================================================
// FUNZIONI DI CARICAMENTO DRIVE (MODIFICATE)
// ====================================================================

/**
 * Costruisce la lista HTML dei file PDF e cartelle annidate per un dato parentId.
 * @param {string} parentId - L'ID della cartella da caricare
 * @param {HTMLElement} targetElement - L'elemento DOM in cui renderizzare i risultati
 */
function renderFolderContents(parentId, targetElement) {
    // ✅ RIMOZIONE RESTRIZIONE: La query cerca tutti i PDF e le cartelle non nel cestino.
    const url = `https://www.googleapis.com/drive/v3/files?q=trashed=false&fields=files(id,name,mimeType,parents)&key=${API_KEY}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                targetElement.innerHTML += `<p style="color:red; font-size: 0.8em;">Errore nel caricamento dei contenuti: ${data.error.message}</p>`;
                return;
            }
            
            // FILTRAGGIO MANUALE (Client-side): Filtriamo per i figli diretti del parentId
            const children = (data.files || []).filter(item => 
                item.parents && item.parents.includes(parentId)
            );
            
            // ... (resto della logica di rendering qui)
             // ...
             // (logica di ordinamento)
             // ...

            const ul = document.createElement('ul');
            
            children.sort((a, b) => {
                const isFolderA = a.mimeType === 'application/vnd.google-apps.folder';
                const isFolderB = b.mimeType === 'application/vnd.google-apps.folder';

                if (isFolderA && !isFolderB) return -1;
                if (!isFolderA && isFolderB) return 1;
                return a.name.localeCompare(b.name);
            });
            
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
            // Questo è l'errore che vedi se la connessione fallisce qui
            targetElement.innerHTML += '<p style="color:red; font-size: 0.8em;">Impossibile connettersi ai contenuti annidati.</p>';
        });
}


function listFilesInFolder() {
    const columnsContainer = document.getElementById('colonne-drive');
    mainSubfolderIDs = []; 
    
    columnsContainer.innerHTML = '<p>Caricamento struttura Drive...</p>';
    
    // ✅ RIMOZIONE RESTRIZIONE: La query cerca tutti gli elementi non nel cestino.
    const url = `https://www.googleapis.com/drive/v3/files?q=trashed=false&fields=files(id,name,mimeType,parents)&key=${API_KEY}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                columnsContainer.innerHTML = `<p style="color:red;">Errore API: ${data.error.message}. Verifica permessi Drive.</p>`;
                console.error('API Error:', data.error);
                return;
            }
            
            columnsContainer.innerHTML = '';
            
            // FILTRAGGIO MANUALE (Client-side): Troviamo solo le cartelle figlie dirette della FOLDER_ID
            const mainFolders = (data.files || []).filter(item => 
                 item.mimeType === 'application/vnd.google-apps.folder' && 
                 item.parents && item.parents.includes(FOLDER_ID)
            );
            
            mainFolders.sort((a, b) => a.name.localeCompare(b.name));

            mainFolders.forEach(folder => {
                mainSubfolderIDs.push(folder.id); 
                
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
             setupSearchControls();
             updateViewer();
        }) 
        .catch(error => { 
            console.error('Errore durante la connessione iniziale all\'API:', error);
            // Questo è l'errore che vedi in questo momento
            columnsContainer.innerHTML = '<p style="color:red;">Impossibile connettersi a Google Drive.</p>';
        }); 
} 

document.addEventListener('DOMContentLoaded', () => {
    listFilesInFolder();
    document.getElementById('reset-button').style.display = 'none'; 
});
