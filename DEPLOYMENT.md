# 🚀 Deployment Guide for OmniIMG

OmniIMG is 100% client-side (HTML5, CSS3, JavaScript, Web APIs). There is **no backend server, no database, and no build process required**. This makes deployment instantaneous and **100% free** on GitHub Pages, Cloudflare Pages, Vercel, Netlify, or any static web host.

---

## 1. Deploying to GitHub Pages (Free)

### Step 1: Initialize Git and Push to GitHub
Open your terminal in the `image-studio` folder:

```bash
cd /Users/vijays/.gemini/antigravity/scratch/image-studio
git init
git add .
git commit -m "Initial commit: OmniIMG Bulk Image Suite"
git branch -M main
```

Create a new repository on [GitHub.com](https://github.com/new) (e.g. named `image-tools` or `img-studio`). Then connect your local repository and push:

```bash
git remote add origin https://github.com/everlovingvijay/YOUR_REPOSITORY_NAME.git
git push -u origin main
```

### Step 2: Enable GitHub Pages
1. Go to your GitHub repository in your browser.
2. Click **Settings** (tab at the top) -> **Pages** (in the left sidebar).
3. Under **Build and deployment**:
   - **Source**: Select **GitHub Actions** (recommended, our `.github/workflows/deploy.yml` workflow will automatically build and publish).
   - Alternatively, choose **Deploy from a branch** -> select `main` branch and `/ (root)` folder -> click **Save**.
4. Within 1-2 minutes, your site will be live at:
   `https://everlovingvijay.github.io/YOUR_REPOSITORY_NAME/`

---

## 2. Deploying on Your Custom Domain (e.g., `img.yourdomain.com` or `yourdomain.com`)

You can map any custom domain directly to your GitHub Pages site for free, complete with automated HTTPS SSL certificates provided by Let's Encrypt / GitHub.

### Method A: Using a Subdomain (Recommended, e.g. `img.yourdomain.com` or `tools.yourdomain.com`)

1. **In your Domain Registrar / DNS Manager** (Cloudflare, GoDaddy, Namecheap, Google Domains):
   - Add a new **CNAME** DNS record:
     - **Type**: `CNAME`
     - **Name / Host**: `img` (or `tools`)
     - **Target / Value**: `everlovingvijay.github.io`
     - **TTL**: Auto or 3600
     - *If using Cloudflare:* Set proxy status to **DNS only** initially until SSL is issued.

2. **In your GitHub Repository**:
   - Go to **Settings** -> **Pages**.
   - In the **Custom domain** box, enter: `img.yourdomain.com`.
   - Click **Save**.
   - GitHub will automatically verify DNS and create a `CNAME` file in your repository.
   - Check the box **Enforce HTTPS** once the DNS check passes (usually within 5 to 15 minutes).

### Method B: Using an Apex Domain (Root, e.g. `yourdomain.com`)

1. **In your Domain Registrar / DNS Manager**:
   - Add four **A** records pointing to GitHub Pages IP addresses:
     ```
     Type: A | Host: @ | Value: 185.199.108.153
     Type: A | Host: @ | Value: 185.199.109.153
     Type: A | Host: @ | Value: 185.199.110.153
     Type: A | Host: @ | Value: 185.199.111.153
     ```
   - (Optional for IPv6) Add four **AAAA** records:
     ```
     Type: AAAA | Host: @ | Value: 2606:50c0:8000::153
     Type: AAAA | Host: @ | Value: 2606:50c0:8001::153
     Type: AAAA | Host: @ | Value: 2606:50c0:8002::153
     Type: AAAA | Host: @ | Value: 2606:50c0:8003::153
     ```
2. **In your GitHub Repository**:
   - Go to **Settings** -> **Pages**.
   - Enter `yourdomain.com` in **Custom domain** and save.
   - Wait for DNS check to succeed, then enable **Enforce HTTPS**.

---

## 3. Alternative 1-Click Hosting Options

Because OmniIMG is 100% static:

### Cloudflare Pages (Super Fast Edge CDN)
1. Push your code to GitHub.
2. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **Compute (Workers) & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Select your repository.
4. Set **Build command**: *None* (leave blank).
5. Set **Build output directory**: `.` (root).
6. Click **Save and Deploy**. You can connect custom domains with 1 click!

### Vercel
1. Import repository in [Vercel](https://vercel.com).
2. Framework Preset: **Other**.
3. Click **Deploy**.

---

## 4. Testing Locally Before Pushing

Run a local web server:

```bash
cd /Users/vijays/.gemini/antigravity/scratch/image-studio
# macOS built-in (instant, zero dependencies):
ruby -run -ehttpd . -p8080

# Or with Python:
python3 -m http.server 8080
```

Visit: `http://localhost:8080` in your browser.
