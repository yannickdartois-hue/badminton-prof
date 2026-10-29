/* aide.js — mode d'emploi de l'outil prof badminton (lu par eps-aide.js) */
window.EPS_AIDE={appli:'Badminton · Outil prof',bouton:false,pied:'Toutes les données restent sur cet appareil : pensez à la sauvegarde après chaque import.',publics:[
{id:'prof',titre:'Professeur',chapitres:[
{t:'Démarrer (rentrée)',html:`<ol><li><b>Classes</b> : importez l’export Pronote de chaque classe (xlsx, xls, csv, ou liste collée) et collez le lien d’envoi du Nuage (« Demande de fichier »).</li>
<li>Premier cours : affichez le <b>QR de démarrage</b> ; chaque groupe le scanne dans l’appli élève.</li>
<li>Installez l’outil sur l’écran d’accueil de l’iPad et faites une <b>sauvegarde</b> après chaque import.</li></ol>`},
{t:'Chaque séance',html:`<ul><li><b>Pilotage</b> → « Poules du jour » : 7 terrains, groupes de 4 ou 5, le 1er monte et le dernier descend. Format proposé : au temps en séances 1 à 3, en points ensuite, 4 min en séance 9. Un QR par terrain, à afficher ou imprimer.</li>
<li><b>Importer</b> : scannez les QR à la suite, ou choisissez les fichiers .json / le .zip du Nuage. Réimporter ne crée pas de doublon.</li>
<li><b>Appel</b> : présents, dispensés, rien reçu ; l’encadré « Groupes » dit qui n’a rien envoyé.</li>
<li><b>Tournoi</b> : poules et classement de la classe. Les tournois saisis dans l’outil du cycle s’importent aussi (Importer → Tournois joués sans tablettes).</li></ul>`},
{t:'Noter (grille GAREEPS)',html:`<ul><li>Épreuve : au moins 3 matchs de 4 min contre des adversaires de niveau équivalent, projet annoncé, coach au temps mort à 2 min, arbitre élève.</li>
<li><b>Note</b> : cochez les séances de l’épreuve, puis pour chaque AFL choisissez le degré et bas, milieu ou haut. AFL1 /12, AFL2 et AFL3 /2, 4 ou 6 selon la répartition de l’élève.</li>
<li>Les <b>analyses de match</b> et la <b>gestion des 15 min</b> écrites par l’élève s’affichent dans la note (« lire ») et dans la saisie rapide.</li>
<li>Les suggestions viennent des séances : c’est vous qui choisissez la note. Export CSV.</li></ul>`},
{t:'Codes oubliés, changement de tablette',html:`<ul><li>Fiche de l’élève → <b>QR de reprise</b> : rend à l’élève son étoile, ses axes, ses matchs à thème et ses poules.</li>
<li>Copies de secours : arrivent avec l’envoi en ligne ; la clé est dans la sauvegarde de l’outil.</li></ul>`},
{t:'Sauvegarde, fin d’année',html:`<ul><li>Importer → <span class="bouton">Exporter une sauvegarde</span> / « Restaurer » pour passer de l’iPad au PC.</li>
<li>Classes → <span class="bouton">Archiver l’année et repartir à zéro</span>.</li></ul>`},
{t:'Démo pour un collègue',html:`<p>« Découvrir avec une classe fictive » (Importer, Classes) ou <b>…/badminton-prof/?demo</b> : vos vraies données ne sont pas touchées.</p>`}]}
]};
