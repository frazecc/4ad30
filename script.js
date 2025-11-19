// ====================================================================
// CONFIGURAZIONE
// ====================================================================

const FOLDER_ID = '1mIa9ygyRsmvQyu_ciaIBBL41rmX4j9NI'; 
const API_KEY = 'AIzaSyDazhUnmMBqsxXG3C6lHCtgvU7xgaFC_zI'; 

// Array per tenere traccia degli ID dei file PDF attualmente selezionati.
const selectedFiles = [];


// ====================================================================
// FUNZIONI DI BASE (Aggiornate)
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

    // Aggiunge un iframe per ogni file selezionato
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
 * Gestisce la selezione/deselezione di un file PDF e aggiorna l'array selectedFiles.
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
    
    // Controlla se la checkbox esiste prima di chiamare l'aggiornamento dello stato
    const fileCheckbox = document.getElementById(`pdf-file-${fileId}`);
    if (fileCheckbox && fileCheckbox.closest('.document-column')) {
        updateColumnCheckboxStatus(fileId);
    }
    
    updateViewer();
}

// Logica per le checkbox di colonna (non modificata)
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
    // 1. Deseleziona/seleziona i file nell'area colonne
    const allColumnCheckboxes = document.querySelectorAll('input[type="checkbox"].column-checkbox');
    allColumnCheckboxes.forEach(columnCheckbox => {
        const columnId = columnCheckbox.id.replace('col-', '');
        if (columnCheckbox.checked !== isChecked) {
             columnCheckbox.checked = isChecked;
             handleColumnCheckboxChange(columnId, isChecked);
        }
    });

    // 2. Aggiorna lo stato dei file nell'area RISULTATI DI RICERCA (se visibile)
    const allSearchCheckboxes = document.querySelectorAll('#search-results input[type="checkbox"]');
    allSearchCheckboxes.forEach(checkbox => {
         if (checkbox.checked !== isChecked) {
             checkbox.checked = isChecked;
             handleFileCheckboxChange(checkbox.id.replace('pdf-file-', ''), checkbox.name, isChecked);
         }
    });
    
    // Se deselezioni tutto, svuota l'array e aggiorna il viewer una sola volta
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
// FUNZIONI DI RICERCA CONTENUTO (NUOVE)
// ====================================================================

/**
 * Esegue la ricerca fullText all'interno dei file PDF su Google Drive.
 */
function searchPdfContent() {
    const query = document.getElementById('search-input').value.trim();
    const columnsContainer = document.getElementById('colonne-drive');
    
    if (!query) {
        alert('Inserisci un termine di ricerca valido.');
        return;
    }
    
    toggleSearchView(true); // Passa alla vista Ricerca
    columnsContainer.innerHTML = `<p>Ricerca di "${query}" in corso...</p>`;
    
    // Query API per cercare il testo ('fullText') SOLO nei PDF e SOLO nella cartella principale (e sottocartelle)
    // Non è possibile usare il FOLDER_ID in modo ricorsivo nel fullText,
    // quindi cerchiamo solo i PDF in generale e speriamo che siano nel progetto.
    const url = `https://www.googleapis.com/drive/v3/files?q=fullText contains '${query}' and mimeType='application/pdf' and trashed=false&fields=files(id,name,mimeType,parents)&key=${API_KEY}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                columnsContainer.innerHTML = `<p style="color:red;">Errore API Ricerca: ${data.error.message}.</p>`;
                console.error('Search API Error:', data.error);
                return;
            }
            
            const results = data.files || [];
            
            // Renderizza i risultati in una colonna "Search Results"
            renderSearchResults(results, columnsContainer, query);
        })
        .catch(error => {
            console.error('Errore durante la ricerca:', error);
            columnsContainer.innerHTML = '<p style="color:red;">Impossibile eseguire la ricerca.</p>';
        });
}

/**
 * Renderizza i risultati della ricerca in una singola colonna.
 */
function renderSearchResults(results, containerElement, query) {
    containerElement.innerHTML = '';
    
    if (results.length === 0) {
        containerElement.innerHTML = `<p>Nessun documento trovato per la ricerca: <strong>${query}</strong>.</p>`;
        return;
    }

    // Crea un contenitore unico per i risultati della ricerca
    const searchColumn = document.createElement('div');
    searchColumn.id = 'search-results';
    searchColumn.classList.add('document-column');
    searchColumn.innerHTML = `<h2>Risultati per "${query}"</h2>`;
    
    const ul = document.createElement('ul');
    
    results.sort((a, b) => a.name.localeCompare(b.name));

    results.forEach(item => {
        const li = document.createElement('li');
        
        // 1. Crea la checkbox (riutilizza l'ID e il gestore)
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `pdf-file-${item.id}`; 
        checkbox.name = item.name;
        
        // Controlla se il file è già selezionato
        const isSelected = selectedFiles.some(f => f.id === item.id);
        checkbox.checked = isSelected;
        
        // 2. Aggiunge l'handler per la selezione (lo stesso usato per le colonne)
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
        deselectAllButton.style.display = 'inline-block';
        listFilesInFolder(); // Ritorna alla visualizzazione delle colonne
    }
}

/**
 * Inizializza gli event listener per i bottoni Cerca e Reset.
 */
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
// FUNZIONI DI CARICAMENTO DRIVE (Non modificate nella logica)
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
                        
                        // Mantiene lo stato di selezione del file
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
    // Nasconde i pulsanti di ricerca se non siamo in modalità ricerca
    toggleSearchView(false); 
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
             setupSearchControls();
             updateViewer();
        }) 
        .catch(error => { 
            console.error('Errore durante la connessione iniziale all\'API:', error);
            columnsContainer.innerHTML = '<p style="color:red;">Impossibile connettersi a Google Drive.</p>';
        }); 
} 

document.addEventListener('DOMContentLoaded', listFilesInFolder);
