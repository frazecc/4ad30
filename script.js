/* style.css */

/* Stile base */
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
}

h1 {
    color: #333;
    border-bottom: 2px solid #007bff;
    padding-bottom: 10px;
}

/* 1. LAYOUT DELLE COLONNE (Flexbox) */
#colonne-drive {
    display: flex; /* Attiva il layout orizzontale */
    gap: 20px; /* Spazio tra le colonne */
    padding: 15px;
    border: 1px solid #ccc;
    overflow-x: auto; /* Abilita lo scorrimento orizzontale se le colonne sono troppe */
    margin-bottom: 20px;
}

/* 2. STILE DELLA SINGOLA COLONNA */
.document-column {
    min-width: 280px; /* Larghezza minima per la leggibilità */
    max-width: 350px; /* Larghezza massima */
    flex-shrink: 0; /* Impedisce alle colonne di rimpicciolirsi troppo */
    padding: 10px;
    background-color: #f8f8f8;
    border-radius: 6px;
    box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
}

/* 3. STILE DEL TITOLO DELLA COLONNA */
.document-column h2 {
    font-size: 1.3em;
    border-bottom: 3px solid #007bff;
    padding-bottom: 5px;
    margin-top: 0;
    margin-bottom: 15px;
    color: #333;
    text-transform: uppercase;
}

/* 4. STILE DELLA LISTA e SCROLL */
.document-column ul {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 400px; /* Altezza massima fissa per la lista */
    overflow-y: auto; /* Abilita lo scorrimento verticale solo all'interno della colonna */
}

/* Stile per i link ai documenti (file PDF) */
.document-link {
    display: block;
    padding: 8px;
    margin-bottom: 4px;
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
    font-size: 0.9em;
    white-space: nowrap; 
    overflow: hidden;
    text-overflow: ellipsis; 
}

.document-link:hover {
    background-color: #d1e7ff;
    box-shadow: 0 0 5px rgba(0, 123, 255, 0.3);
}

/* Stile per le sottocartelle (se presenti all'interno di una colonna) */
.sub-folder-title {
    font-size: 0.95em;
    color: #495057;
    margin-top: 10px;
    margin-bottom: 5px;
    font-weight: bold;
}

/* Stile per il visualizzatore PDF */
#pdf-viewer {
    border: 1px solid #ccc;
    padding: 10px;
    min-height: 200px;
    background-color: #fff;
}
