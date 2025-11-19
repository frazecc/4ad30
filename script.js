// ====================================================================
// CONFIGURAZIONE
// ====================================================================

// L'ID della tua cartella madre 'PIC PER SITO'
const FOLDER_ID = '1mIa9ygyRsmvQyu_ciaIBBL41rmX4j9NI'; 

// Chiave API funzionante
const API_KEY = 'AIzaSyDazhUnmMBqsxXG3C6lHCtgvU7xgaFC_zI'; 


// ====================================================================
// FUNZIONI DI BASE PER LA VISUALIZZAZIONE E IL FILTRO
// ====================================================================

/**
 * Aggiorna il visualizzatore PDF mostrando il primo file selezionato.
 * Il viewer di Google Drive supporta tipicamente un solo embed alla volta.
 */
function updateViewer() {
    // Trova tutte le checkbox selezionate nell'intera pagina
    const selectedCheckboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    const viewerElement = document.getElementById('pdf-viewer');
    
    if (selectedCheckboxes.length > 0) {
        // Prendiamo l'ID del primo file selezionato
        const firstFileId = selectedCheckboxes[0].value;
        const embedUrl = `https://drive.google.com/file/d/${firstFileId}/preview`;
        
        // Visualizza il PDF selezionato
        viewerElement.innerHTML = `<iframe src="${embedUrl}" width="100%" height="600px" frameborder="0"></iframe>`;

        // Se ci sono più di un file selezionato, potresti voler mostrare un messaggio
        if (selectedCheckboxes.length > 1) {
             // Opzionale: puoi aggiungere qui un messaggio per informare l'utente
        }
        
    } else {
        // Nessun file selezionato, pulisci il visualizzatore
        viewerElement.innerHTML = '<p>Seleziona un file PDF dalle colonne per visualizzarlo.</p>';
    }
}


/**
 * Costruisce la lista HTML dei file PDF e cartelle annidate per un dato parentId.
 * @param {string} parentId - L'ID della cartella genitore.
 * @param {HTMLElement} targetElement - L'elemento in cui iniettare la lista.
 */
function renderFolderContents(parentId, targetElement) {
    // 🌐 QUERY DETTAGLIO: Cerca i PDF e le sottocartelle dirette sotto parentId.
    const url = `https://www.googleapis.com/drive/v3/files?q='${parentId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,parents)&key=${API_KEY}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                targetElement.innerHTML += `<p style="color:red; font-size: 0.8em;">Errore nel caricamento dei contenuti: ${data.error.message}</p>`;
                return;
            }
            
            const children = data.files || [];
            
            // Ordina: Cartelle prime, poi File, in ordine alfabetico
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
                    // È un file PDF
                    if (item.mimeType === 'application/pdf') {
                        
                        // Crea la casella di controllo
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.value = item.id; // L'ID del file è il valore della checkbox
                        checkbox.id = `pdf-${item.id}`;
                        
                        // Assegna la funzione di aggiornamento al cambio di stato
                        checkbox.onchange = updateViewer;
                        
                        // Crea l'etichetta per il nome del file
                        const label = document.createElement('label');
                        label.htmlFor = checkbox.id;
                        label.textContent = item.name;
                        
                        // Aggiungi checkbox e label al list item
                        li.appendChild(checkbox);
                        li.appendChild(label);
                        
                        ul.appendChild(li);
                    }
                } else {
                    // È una sottocartella annidata
                    li.innerHTML = `<strong>${item.name}</strong>`;
                    li.classList.add('sub-folder-title');
                    ul.appendChild(li);
                    
                    // Chiama ricorsivamente per annidare i contenuti
                    renderFolderContents(item.id, li);
                }
            });
            
            if (ul.children.length > 0) {
                targetElement.appendChild(ul);
            }
        })
        .catch(error => {
            console.error('Errore durante la connessione ai contenuti:', error);
        });
}


// ====================================================================
// FUNZIONE PRINCIPALE: RECUPERO DATI API E COSTRUZIONE COLONNE
// ====================================================================

function listFilesInFolder() {
    const columnsContainer = document.getElementById('colonne-drive');
    columnsContainer.innerHTML = '<p>Caricamento struttura Drive: ricerca colonne...</p>';
    
    // 🌐 PRIMA QUERY: Cerca solo le sottocartelle principali (Livello 1)
    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name,mimeType,parents)&key=${API_KEY}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                columnsContainer.innerHTML = `<p style="color:red;">Errore API: ${data.error.message}. Verifica permessi Drive.</p>`;
                console.error('API Error:', data.error);
                return;
            }
            
            columnsContainer.innerHTML = ''; // Pulisce il messaggio di caricamento
            
            const mainFolders = data.files || [];
            
            // Ordina alfabeticamente le cartelle principali
            mainFolders.sort((a, b) => a.name.localeCompare(b.name));

            // Genera una colonna per OGNI cartella principale
            mainFolders.forEach(folder => {
                const columnDiv = document.createElement('div');
                columnDiv.classList.add('document-column');

                // Titolo della Colonna
                columnDiv.innerHTML = `<h2>${folder.name}</h2>`;

                // Popola la colonna chiamando la funzione di ricerca ricorsiva
                renderFolderContents(folder.id, columnDiv);
                
                columnsContainer.appendChild(columnDiv);
            });
            
             if (mainFolders.length === 0) {
                 columnsContainer.innerHTML = '<p>Nessuna sottocartella principale trovata.</p>';
             }
             
             // Inizializza il visualizzatore alla fine del caricamento
             updateViewer();
        }) 
        .catch(error => { 
            console.error('Errore durante la connessione iniziale all\'API:', error);
            columnsContainer.innerHTML = '<p style="color:red;">Impossibile connettersi a Google Drive.</p>';
        }); 
} 

document.addEventListener('DOMContentLoaded', listFilesInFolder);
