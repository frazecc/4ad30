// ====================================================================
// CONFIGURAZIONE
// ====================================================================

const FOLDER_ID = '1u3oZ-4XAOGEz5ygGEyb6fQrWnQ17sCjE'; 
// 🔑 SOSTITUISCI con il tuo ID CLIENTE ottenuto dalla Console Cloud
const CLIENT_ID = '816591901188-disho7bqlb3g1m9d07amkfp989k0hhto.apps.googleusercontent.com'; 
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

// L'ambito richiesto per vedere i metadati dei file pubblici e di quelli condivisi con l'utente
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly'; 

const selectedFiles = [];
let mainSubfolderIDs = []; 
let GAPI_LOADED = false;
let GOOGLE_AUTH_CLIENT = null;


// ====================================================================
// FUNZIONI DI AUTORIZZAZIONE e INIZIALIZZAZIONE
// ====================================================================

/**
 * Funzione per gestire il login o l'autorizzazione
 */
function handleAuthClick() {
    if (GOOGLE_AUTH_CLIENT) {
        // Avvia il processo di autorizzazione. Questo aprirà il pop-up di Google.
        GOOGLE_AUTH_CLIENT.requestAccessToken();
    } else {
        alert("Librerie Google non caricate. Ricarica la pagina.");
    }
}

/**
 * Gestisce la risposta del token restituita da Google.
 * Se l'utente ha autorizzato, carichiamo la struttura.
 */
function handleAuthResponse(tokenResponse) {
    if (tokenResponse && tokenResponse.access_token) {
        console.log("Accesso concesso. Inizio caricamento Drive...");
        listFilesInFolder(); // Avvia il caricamento dei file
    } else {
        console.error("Accesso negato o token non ricevuto.");
    }
}

/**
 * Inizializza il client GIS (Google Identity Services) e l'interfaccia.
 */
function initClient() {
    // 1. Inizializza il client di autorizzazione GIS
    GOOGLE_AUTH_CLIENT = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: handleAuthResponse, // Funzione da chiamare dopo l'autorizzazione
    });

    // 2. Aggiunge un handler per il pulsante di login (che ora sarà il pulsante Cerca/Struttura)
    const authButton = document.getElementById('auth-button'); // Creiamo un nuovo pulsante nell'HTML
    if (authButton) {
        authButton.onclick = handleAuthClick;
        authButton.textContent = 'AUTORIZZA E CARICA DRIVE';
        authButton.style.display = 'block';
    }
    
    document.getElementById('colonne-drive').innerHTML = '<p>Premi il pulsante "AUTORIZZA" per connetterti al Drive.</p>';

    // 3. Carica la libreria gapi (per le successive chiamate API)
    gapi.load('client', () => {
        gapi.client.init({
            discoveryDocs: DISCOVERY_DOCS,
        }).then(() => {
            GAPI_LOADED = true;
            console.log("Libreria GAPI caricata.");
        });
    });
}


// ====================================================================
// FUNZIONI DI RICERCA CONTENUTO (ORA USANO gapi.client)
// ====================================================================

function searchPdfContent() {
    if (!gapi.client.getToken()) {
        alert("Devi prima autorizzare l'accesso a Google Drive.");
        handleAuthClick();
        return;
    }
    
    const query = document.getElementById('search-input').value.trim();
    const columnsContainer = document.getElementById('colonne-drive');
    
    if (!query) {
        alert('Inserisci un termine di ricerca valido.');
        return;
    }
    
    toggleSearchView(true);
    columnsContainer.innerHTML = `<p>Ricerca di "${query}" in corso...</p>`;
    
    // ✅ UTILIZZO DI GAPI PER LA CHIAMATA API (più sicuro e corretto con OAuth)
    const encodedQuery = query.replace(/'/g, "\\'"); 
    const driveQuery = `fullText contains '${encodedQuery}' and mimeType='application/pdf' and trashed=false`;
    
    gapi.client.drive.files.list({
        q: driveQuery,
        fields: 'files(id,name,mimeType,parents)',
        pageSize: 100 // Aumentiamo il limite di pagina per la ricerca
    }).then(response => {
        const results = response.result.files || [];
        renderSearchResults(results, columnsContainer, query);
    }).catch(error => {
        console.error('Errore durante la ricerca:', error);
        columnsContainer.innerHTML = `<p style="color:red;">Errore API Ricerca: ${error.body ? JSON.parse(error.body).error.message : error.message}.</p>`;
    });
}


// ====================================================================
// FUNZIONI DI CARICAMENTO DRIVE (ORA USANO gapi.client)
// ====================================================================

function renderFolderContents(parentId, targetElement) {
    // ✅ NUOVA QUERY: Utilizziamo 'in parents' che ora funziona con OAuth!
    const driveQuery = `'${parentId}' in parents and trashed=false`;
    
    gapi.client.drive.files.list({
        q: driveQuery,
        fields: 'files(id,name,mimeType,parents)',
        pageSize: 100
    }).then(response => {
        const children = response.result.files || [];
        
        // ... (logica di ordinamento e rendering come prima) ...
        // (Devi copiare qui la parte di codice che gestisce l'ordinamento e la creazione di ul/li)
        
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
        
    }).catch(error => {
        console.error('Errore durante la connessione ai contenuti:', error);
        targetElement.innerHTML += `<p style="color:red; font-size: 0.8em;">Errore nel caricamento dei contenuti: ${error.body ? JSON.parse(error.body).error.message : error.message}.</p>`;
    });
}


function listFilesInFolder() {
    if (!gapi.client.getToken()) {
        alert("Devi prima autorizzare l'accesso a Google Drive.");
        handleAuthClick();
        return;
    }
    
    const columnsContainer = document.getElementById('colonne-drive');
    mainSubfolderIDs = []; 
    columnsContainer.innerHTML = '<p>Caricamento struttura Drive...</p>';
    
    const driveQuery = `'${FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    
    gapi.client.drive.files.list({
        q: driveQuery,
        fields: 'files(id,name,mimeType,parents)',
        pageSize: 100
    }).then(response => {
        const mainFolders = response.result.files || [];
        columnsContainer.innerHTML = '';
        
        mainFolders.sort((a, b) => a.name.localeCompare(b.name));

        mainFolders.forEach(folder => {
            mainSubfolderIDs.push(folder.id); 
            
            const columnDiv = document.createElement('div');
            columnDiv.classList.add('document-column');
            columnDiv.dataset.folderId = folder.id;

            // ... (logica di creazione checkbox e header come prima)
            // (Devi copiare qui la parte di codice che crea columnDiv, colCheckbox, titleHeader e headerContainer)
            
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
         
    }).catch(error => { 
        console.error('Errore durante la connessione iniziale all\'API:', error);
        columnsContainer.innerHTML = `<p style="color:red;">Impossibile connettersi a Google Drive. Errore: ${error.body ? JSON.parse(error.body).error.message : error.message}</p>`;
    }); 
} 

document.addEventListener('DOMContentLoaded', () => {
    // Aggiungiamo un listener per caricare l'API dopo che il DOM è pronto
    const authButton = document.createElement('button');
    authButton.id = 'auth-button';
    authButton.style.display = 'none'; // Nascondi fino all'inizializzazione
    document.getElementById('drive-controls').prepend(authButton);
    
    // Carica la libreria GAPI per l'inizializzazione
    const scriptGapi = document.createElement('script');
    scriptGapi.src = "https://apis.google.com/js/api.js";
    scriptGapi.onload = initClient; // Chiama initClient una volta caricata l'API GAPI
    document.head.appendChild(scriptGapi);

    document.getElementById('reset-button').style.display = 'none'; 
});
// Assicurati che le funzioni di controllo globale/ricerca non modificate siano incluse qui!
// (p.es. renderSearchResults, toggleSearchView, setupSearchControls, handleColumnCheckboxChange, ecc.)
