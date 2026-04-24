# ⚜ Guilde du Mille Royaume

Dashboard financier gamifié inspiré de Fairy Tail.
Suivi **Degiro · Épargne · Compte Commun · Compte Perso · Crypto · Polymarket** vers l'objectif **1 000 000 €**.

## ✨ Features

- **9 rangs de mage** (D → Maître de Guilde) avec animation d'ascension à chaque level-up
- **Barre d'XP** vers l'objectif 1M€ avec % en temps réel
- **6 Arcanes** (un par compte) avec part du trésor + mini-barre de pouvoir
- **Chronique** : historique graphique (Chart.js) — tu scelles un point quand tu veux
- **Codex de Quêtes** : objectifs dynamiques (prochain rang, milestones, diversification)
- **Chiffrement AES-GCM optionnel** (Web Crypto API, PBKDF2 250k itérations)
- **Export / Import JSON** pour backup manuel
- **100% client-side** : aucun serveur, aucune télémétrie

## 🔒 Sécurité

- Fichier statique unique → zero backend = zero surface d'attaque serveur
- Données en `localStorage` chiffrées AES-256-GCM si tu forges un sceau (passphrase)
- Dérivation de clé PBKDF2-SHA256 · 250 000 itérations · salt + IV aléatoires
- Dépendances externes : uniquement Google Fonts (CSS) et Chart.js (CDN jsDelivr)
- La passphrase n'est **jamais** stockée : impossible de la récupérer → fais un export backup

## 🚀 Déploiement GitHub Pages (3 minutes)

### Option A — Repo public ou privé (plan Pro/Team pour Pages privé)

```bash
# Depuis ton dossier
git init
git add index.html README.md
git commit -m "⚜ Initial guild"
git branch -M main
git remote add origin https://github.com/TON_USER/TON_REPO.git
git push -u origin main
```

Puis dans le repo GitHub :

1. `Settings` → `Pages`
2. Source : `Deploy from a branch`
3. Branch : `main` · Folder : `/ (root)` · `Save`
4. Attends ~1 min → l'URL s'affiche : `https://TON_USER.github.io/TON_REPO/`

### Option B — Repo privé sans plan payant

GitHub Pages sur repo privé nécessite GitHub Pro. Alternatives gratuites :
- **Cloudflare Pages** : connecter le repo, build command vide, output `/` → deploy
- **Netlify** : drag & drop du fichier `index.html` sur netlify.com/drop

## 🔐 Recommandations sécurité

| Niveau | Action |
|---|---|
| 🥇 **Max** | Repo privé + Cloudflare Pages + passphrase forte (16+ chars) + export backup régulier |
| 🥈 Bon | Repo public + passphrase + URL peu partagée |
| 🥉 Minimum | Sans sceau mais URL connue de toi seul |

**À retenir** :
- L'URL GitHub Pages est publique par défaut, mais tes données sont dans **ton navigateur**, pas sur GitHub. Quelqu'un qui accède à l'URL voit juste une app vide.
- Si tu te connectes depuis un autre device → grimoire vide (normal). Utilise `Importer Grimoire` pour migrer.
- **Backup exports régulier** : `Exporter Grimoire` → garde le JSON dans un coffre (Bitwarden, disque chiffré, etc.)

## 🎮 Usage

1. **Première visite** : choisis une passphrase (ou skip pour sans chiffrement)
2. Clique sur un **Arcane** → entre le montant → `Sceller`
3. Franchis un palier → animation d'**Ascension** 🎉
4. Périodiquement, clique `⚔ Sceller Cet Instant` → ajoute un point à la Chronique

## 🛠 Customisation

Modifie dans `index.html` :
- **Rangs** : tableau `RANKS` (ligne ~540) — ajoute/modifie paliers, noms, couleurs
- **Comptes** : tableau `ACCOUNT_DEFS` (ligne ~560) — change les 6 comptes ou ajoute-en
- **Objectif** : réglable en live via le Conseil (⚙)
- **Couleurs** : variables CSS en haut du `<style>`

## 📱 Mobile

Responsive, testé jusqu'à 360px de large. Les grilles passent en 1 colonne automatiquement.

## 📄 License

MIT — fais-en ce que tu veux.

---

*Forgé avec Claude · Obsidienne, or et crimson.*
