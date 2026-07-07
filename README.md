# InfluX Portal — Social Media Influencer Marketing Platform

## Overview
A complete PHP + MySQL influencer marketing portal with:
- **Admin Portal** — Manage influencers, products, campaigns, analytics, payouts
- **Influencer Portal** — View campaigns, copy tracking links, wallet earnings
- **Public Landing Page** — Beautiful form for end users (click tracking + discount)

## Quick Start

### 1. Database Setup
Run `setup.php` in your browser once:
```
http://localhost/setup.php
```
Then **delete** `setup.php` for security.

### 2. Default Credentials
| Role | Email | Password |
|---|---|---|
| Admin | admin@influx.com | admin@123 |
| Influencer | ajit.kumar@gmail.com | inf@123 |

### 3. Database Config
File: `config/database.php`
```
Host:     localhost
Database: socialmedia_track
User:     root
Password: S@nds1@b
```

## Git + Webhook Deployment

### Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ajitsands/socialmediatrack.git
git push -u origin main
```

### GitHub Webhook Setup
1. Go to GitHub repo → Settings → Webhooks → Add webhook
2. **Payload URL**: `https://tracksocialmedia.sandslab.com/webhook.php`
3. **Content type**: `application/json`
4. **Secret**: `InfluXWebhook$3cr3t2025`
5. **Events**: Just the push event

### Server Requirements
- PHP 8.0+
- MySQL 5.7+ / MariaDB 10.3+
- Apache with `mod_rewrite` enabled
- OpenSSL PHP extension (for AES encryption)

## Features
- ✅ Light Mode (default) + Dark Mode toggle
- ✅ English (default) + Arabic (RTL) language toggle
- ✅ Encrypted tracking URLs (AES-256-CBC)
- ✅ Offer code format: `AJ-PR01-X2F01` (initials + product + random)
- ✅ Country code selector (Middle East first → India/Pakistan/Bangladesh → All A-Z)
- ✅ DataTables for all tables
- ✅ SweetAlert2 for all notifications
- ✅ jQuery AJAX + JSON communication
- ✅ Live stat counters with animation
- ✅ Mobile-first responsive design
- ✅ GitHub webhook auto-deployment

## File Structure
```
├── index.php         ← Main SPA (admin + influencer)
├── landing.php       ← Public landing page
├── setup.php         ← One-time DB setup (delete after use!)
├── webhook.php       ← GitHub auto-deploy
├── .htaccess
├── config/           ← DB, app config, crypto helpers
├── api/              ← JSON REST API endpoints
├── css/              ← Stylesheets
└── js/               ← Frontend modules
```
