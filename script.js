// ====================================================================
// CONFIGURAZIONE
// ====================================================================

const FOLDER_ID = '1mIa9ygyRsmvQyu_ciaIBBL41rmX4j9NI'; 
const API_KEY = 'AIzaSyDazhUnmMBqsxXG3C6lHCtgvU7xgaFC_zI'; 

// Variabili globali per lo stato dell'applicazione
const selectedFiles = [];
let mainFoldersStructure = []; // Salverà la lista delle cartelle principali (Livello 1)
let allDriveElements = [];    // Salverà l'elenco completo di file e cartelle (per la ricostruzione)


// ====================================================================
// FUNZIONI DI GESTIONE VISUALIZZAZIONE E SELEZIONE
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
    
    updateColumnCheckboxStatus(fileId);
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
    const allCheckboxes = document.querySelectorAll('input[type="checkbox"].column-checkbox');
    
    allCheckboxes.forEach(columnCheckbox => {
        const columnId = columnCheckbox.id.replace('col-', '');
        
        if (columnCheckbox.checked !== isChecked) {
             columnCheckbox.checked = isChecked;
             handleColumnCheckboxChange(columnId, isChecked);
        }
    });
    
    updateViewer();
}

function setupGlobalControls() {
    document.getElementById('seleziona-tutto').addEventListener('click', () => selectAll(true));
    document.getElementById('deseleziona-tutto').addEventListener('click', () => selectAll(false));

    // Aggiungi listener per la ricerca
    document.getElementById('pulsante-ricerca').addEventListener('click', searchFiles);
    document.getElementById('pulsante-reset').addEventListener('click', resetSearch);
    document.getElementById('campo-ricerca').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchFiles();
        }
    });
}


// ====================================================================
// FUNZIONI DI RICERCA (NUOVA IMPLEMENTAZIONE)
// ====================================================================

function resetSearch() {
    // 1. Pulisce il campo
    document.getElementById('campo-ricerca').value = '';
    
    // 2. Nasconde il pulsante Reset
    document.getElementById('pulsante-reset').style.display = 'none';

    // 3. Ripristina la visualizzazione iniziale (ricostruendo il DOM dalle variabili globali)
    renderColumns(mainFoldersStructure);
}

function searchFiles() {
    const query = document.getElementById('campo-ricerca').value.trim();

    if (query.length < 3) {
        alert("Inserisci almeno 3 caratteri per la ricerca.");
        return;
    }
    
    // Nasconde il pulsante Ricerca e mostra Reset
    document.getElementById('pulsante-ricerca').style.display = 'none';
    document.getElementById('pulsante-reset').style.display = 'inline-block';

    const columnsContainer = document.getElementById('colonne-drive');
    columnsContainer.innerHTML = `<p>Ricerca in corso per: <strong>${query}</strong>...</p>`;
    
    // 🌐 QUERY FULL-TEXT: Cerca in tutti i file (name, description, content) 
    // Drive indicizza il testo interno dei PDF (full-text search)
    const encodedQuery = encodeURIComponent(`fullText contains '${query}' and mimeType='application/pdf' and trashed=false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodedQuery}&fields=files(id,name,mimeType,parents)&key=${API_KEY}`;

    fetch(searchUrl)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                columnsContainer.innerHTML = `<p style="color:red;">Errore ricerca: ${data.error.message}.</p>`;
                console.error('Search API Error:', data.error);
                return;
            }
            
            const searchResults = data.files || [];
            
            if (searchResults.length === 0) {
                columnsContainer.innerHTML = `<p>Nessun documento trovato con la parola chiave: <strong>${query}</strong>.</p>`;
                return;
            }
            
            // Filtra solo i risultati che sono figli di QUALCHE cartella principale (e quindi rilevanti)
            const filteredResults = searchResults.filter(file => {
                return mainFoldersStructure.some(folder => file.parents && file.parents.includes(folder.id));
            });
            
            // Disegna il risultato
            renderSearchResults(filteredResults, query);
            
        })
        .catch(error => { 
            console.error('Errore durante la ricerca:', error);
            columnsContainer.innerHTML = '<p style="color:red;">Impossibile eseguire la ricerca in Drive.</p>';
        }); 
}

/**
 * Funzione che disegna i risultati della ricerca in una colonna unica.
 */
function renderSearchResults(files, query) {
    const columnsContainer = document.getElementById('colonne-drive');
    columnsContainer.innerHTML = ''; 

    const columnDiv = document.createElement('div');
    columnDiv.classList.add('document-column');
    columnDiv.style.minWidth = '400px'; 

    columnDiv.innerHTML = `<h2>Risultati per "${query}"</h2>`;
    
    const ul = document.createElement('ul');
    
    files.forEach(item => {
        const li = document.createElement('li');
        
        // Cerca il nome della cartella genitore per contesto
        const parentFolder = mainFoldersStructure.find(folder => item.parents && item.parents.includes(folder.id));
        const context = parentFolder ? ` (${parentFolder.name})` : '';

        // Checkbox e Label
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `pdf-file-${item.id}`; 
        checkbox.name = item.name;
        checkbox.onchange = (e) => handleFileCheckboxChange(item.id, item.name, e.target.checked);
        
        const label = document.createElement('label');
        label.htmlFor = `pdf-file-${item.id}`;
        label.innerHTML = `${item.name} <span style="font-size: 0.8em; color: #bbb;">${context}</span>`;

        li.appendChild(checkbox);
        li.appendChild(label);
        ul.appendChild(li);
    });

    columnDiv.appendChild(ul);
    columnsContainer.appendChild(columnDiv);
    
    // Assicurati che i file precedentemente selezionati mantengano lo stato checked
    files.forEach(file => {
        const checkbox = document.getElementById(`pdf-file-${file.id}`);
        if (checkbox && selectedFiles.some(f => f.id === file.id)) {
            checkbox.checked = true;
        }
    });
}


// ====================================================================
// FUNZIONI DI CARICAMENTO DRIVE (RICORSIONE)
// ====================================================================

/**
 * Funzione ricorsiva che disegna la lista dei contenuti di una cartella.
 */
function renderFolderContents(parentId, targetElement) {
    // Trova i figli diretti nell'array allDriveElements
    const children = allDriveElements.filter(el => 
        el.parents && el.parents.includes(parentId)
    );

    // Ordina: Cartelle prime, poi File, in ordine alfabetico (logica come prima)
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
                checkbox.onchange = (e) => handleFileCheckboxChange(item.id, item.name, e.target.checked);

                // Mantiene lo stato selezionato se presente in selectedFiles
                if (selectedFiles.some(f => f.id === item.id)) {
                    checkbox.checked = true;
                }

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
            
            // Chiama ricorsivamente
            renderFolderContents(item.id, li);
        }
    });
    
    if (ul.children.length > 0) {
        targetElement.appendChild(ul);
    }
}

/**
 * Funzione che ricostruisce il DOM delle colonne
 */
function renderColumns(folders) {
    const columnsContainer = document.getElementById('colonne-drive');
    columnsContainer.innerHTML = '';
    
    folders.forEach(folder => {
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
        
        // Popola la colonna con la ricorsione
        renderFolderContents(folder.id, columnDiv);
        columnsContainer.appendChild(columnDiv);
        
        // Aggiorna lo stato della checkbox principale
        updateColumnCheckboxStatus(folder.id);
    });
    
    if (folders.length === 0) {
         columnsContainer.innerHTML = '<p>Nessuna sottocartella principale trovata.</p>';
    }
    updateViewer();
}

/**
 * Funzione principale che carica tutti i dati Drive la prima volta.
 */
function listFilesInFolder() {
    const columnsContainer = document.getElementById('colonne-drive');
    columnsContainer.innerHTML = '<p>Caricamento iniziale della struttura Drive...</p>';
    
    // 🌐 QUERY INIZIALE: Recupera TUTTI i file/cartelle sotto la radice in un colpo solo
    // NOTA: Si presuppone che non ci siano migliaia di file; altrimenti servirebbe la paginazione.
    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+or+'${FOLDER_ID}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,parents)&key=${API_KEY}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                columnsContainer.innerHTML = `<p style="color:red;">Errore API: ${data.error.message}. Verifica permessi Drive.</p>`;
                console.error('API Error:', data.error);
                return;
            }
            
            allDriveElements = data.files || [];
            
            // 1. Identifica le SOTTOCARTELLE PRINCIPALI (Livello 1)
            mainFoldersStructure = allDriveElements.filter(el => 
                el.parents && el.parents.includes(FOLDER_ID) && 
                el.mimeType === 'application/vnd.google-apps.folder'
            );

            // Ordina alfabeticamente
            mainFoldersStructure.sort((a, b) => a.name.localeCompare(b.name));

            // 2. Disegna le colonne
            renderColumns(mainFoldersStructure);
             
            // 3. Inizializza i bottoni di controllo globali e la ricerca
            setupGlobalControls();
        }) 
        .catch(error => { 
            console.error('Errore durante la connessione iniziale all\'API:', error);
            columnsContainer.innerHTML = '<p style="color:red;">Impossibile connettersi a Google Drive.</p>';
        }); 
} 

document.addEventListener('DOMContentLoaded', listFilesInFolder);
