// ====================================================================
// CONFIGURAZIONE
// ====================================================================

const FOLDER_ID = '1u3oZ-4XAOGEz5ygGEyb6fQrWnQ17sCjE'; 
// La nuova chiave API:
const API_KEY = 'AIzaSyC0sxsoNUPZIUpkqicVSzWXjCQd7D1gqfs'; 

const selectedFiles = [];
// NUOVO: Memorizziamo gli ID delle sottocartelle principali per la ricerca
let mainSubfolderIDs = []; 


// ====================================================================
// FUNZIONI DI BASE (Omesse per brevità, sono le stesse)
// ====================================================================
// ... (TUTTE le funzioni listate prima: updateViewer, handleFileCheckboxChange,
//      updateColumnCheckboxStatus, handleColumnCheckboxChange, selectAll, 
//      setupGlobalControls, renderSearchResults, toggleSearchView, setupSearchControls)
//      DEVONO essere qui.
//
// NOTA: Se hai mantenuto il codice dell'ultima volta, inserisco solo le modifiche qui sotto:
// 
// ====================================================================
// FUNZIONI DI RICERCA CONTENUTO (MODIFICATA PER RICERCA MULTI-PARENT)
// ====================================================================

/**
 * Esegue la ricerca fullText all'interno dei file PDF su Google Drive usando 
 * la lista di ID delle sottocartelle principali (mainSubfolderIDs) come restrizione.
 */
function searchPdfContent() {
    const query = document.getElementById('search-input').value.trim();
    const columnsContainer = document.getElementById('colonne-drive');
    
    if (!query) {
        alert('Inserisci un termine di ricerca valido.');
        return;
    }
    
    if (mainSubfolderIDs.length === 0) {
        columnsContainer.innerHTML = `<p style="color: red;">Errore: Nessuna cartella principale caricata per la ricerca.</p>`;
        return;
    }
    
    toggleSearchView(true); // Passa alla vista Ricerca
    columnsContainer.innerHTML = `<p>Ricerca di "${query}" in corso...</p>`;
    
    const encodedQuery = encodeURIComponent(query);
    
    // Costruisce la clausola OR per includere la cartella madre e tutte le sue sottocartelle principali.
    // Esempio: ('id1' in parents or 'id2' in parents or ... or 'FOLDER_ID' in parents)
    const parentClauses = mainSubfolderIDs.map(id => `'${id}' in parents`).join(' or ');
    const allParentsClause = `(${parentClauses} or '${FOLDER_ID}' in parents)`;
    
    // Costruiamo la query che cerca il contenuto E che si trova in una qualsiasi delle cartelle radice/sottocartelle.
    // ATTENZIONE: Questa ricerca funziona solo per i file che sono figli diretti di queste cartelle. 
    // Per i file profondamente annidati, avrai ancora bisogno della condivisione pubblica globale.
    const url = `https://www.googleapis.com/drive/v3/files?q=fullText contains '${encodedQuery}' and mimeType='application/pdf' and trashed=false and ${allParentsClause}&fields=files(id,name,mimeType,parents)&key=${API_KEY}`;

    console.log("Query di ricerca usata:", url); // Utile per F12
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                columnsContainer.innerHTML = `<p style="color:red;">Errore API Ricerca: ${data.error.message}. <br><strong>Verifica che TUTTI i file PDF, anche quelli annidati, siano condivisi come 'Chiunque abbia il link'.</strong></p>`;
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


// ====================================================================
// FUNZIONI DI CARICAMENTO DRIVE (MODIFICATA PER SALVARE GLI ID)
// ====================================================================

function listFilesInFolder() {
    const columnsContainer = document.getElementById('colonne-drive');
    // Svuotiamo l'array prima di ricaricare la struttura
    mainSubfolderIDs = []; 
    
    columnsContainer.innerHTML = '<p>Caricamento struttura Drive...</p>';
    
    // Questa query trova le sottocartelle dirette della FOLDER_ID
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
                // Aggiungiamo l'ID della sottocartella principale
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
            columnsContainer.innerHTML = '<p style="color:red;">Impossibile connettersi a Google Drive.</p>';
        }); 
} 

document.addEventListener('DOMContentLoaded', () => {
    // Inizializza la vista
    listFilesInFolder();
    // Nasconde i pulsanti di reset all'avvio
    document.getElementById('reset-button').style.display = 'none'; 
});


// (Nota: Per completezza, inserisci anche tutte le funzioni non modificate qui!)
