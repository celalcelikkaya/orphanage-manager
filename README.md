# Orphanage Manager

Orphanage Manager is a modern, fast, and centralized web application developed to digitalize orphanage operations, manage donations, track children's activities, and handle day-to-day administration.

**[Download the latest release](https://github.com/celalcelikkaya/orphanage-manager/releases/latest/download/orphanage-manager-main-v2.zip)** &nbsp;·&nbsp; [Release notes and all versions](https://github.com/celalcelikkaya/orphanage-manager/releases/latest) &nbsp;·&nbsp;
[Live Demo](https://celalcelikkaya.github.io/demo-orphanage.html) 

Explore the Live Demo, test the application right away without setting up Google Apps Script? Check out the fully functional (pre-loaded with sample data, nothing is saved).

## Features
- **Centralized Data Management:** Secure and fast data storage powered by Google Apps Script and Google Sheets.
- **Modern User Interface:** Responsive design built for both mobile and desktop, supporting dark mode.
- **Modular Architecture:** Clean separation of backend logic and frontend components.

## Screenshots

**Desktop**

<table>
  <tr>
    <td align="center" width="50%"><b>Home</b><br><sub>Balance, income and expenses</sub><br><br><img src="https://raw.githubusercontent.com/celalcelikkaya/orphanage-manager/main/docs/screenshots/orphanage-desktop-home.webp" width="100%" alt="Desktop home screen with current balance, income and expenses"></td>
    <td align="center" width="50%"><b>Records</b><br><sub>Income and expense list</sub><br><br><img src="https://raw.githubusercontent.com/celalcelikkaya/orphanage-manager/main/docs/screenshots/orphanage-desktop-records.webp" width="100%" alt="Desktop records list with income and expenses"></td>
  </tr>
  <tr>
    <td align="center"><b>Funds</b><br><sub>Transfers and exchange rates</sub><br><br><img src="https://raw.githubusercontent.com/celalcelikkaya/orphanage-manager/main/docs/screenshots/orphanage-desktop-funds.webp" width="100%" alt="Desktop funds screen with transfers and exchange rates"></td>
    <td align="center"><b>Changes</b><br><sub>Reasons, questions and answers</sub><br><br><img src="https://raw.githubusercontent.com/celalcelikkaya/orphanage-manager/main/docs/screenshots/orphanage-desktop-changes.webp" width="100%" alt="Desktop changes screen with reasons, questions and answers"></td>
  </tr>
  <tr>
    <td align="center" colspan="2"><b>Dark mode</b><br><sub>Home screen in dark theme</sub><br><br><img src="https://raw.githubusercontent.com/celalcelikkaya/orphanage-manager/main/docs/screenshots/orphanage-desktop-dark.webp" width="50%" alt="Desktop home screen in dark mode"></td>
  </tr>
</table>

**Mobile**

<table>
  <tr>
    <td align="center" width="20%"><b>Home</b><br><sub>Balance, income and expenses</sub><br><br><img src="https://raw.githubusercontent.com/celalcelikkaya/orphanage-manager/main/docs/screenshots/orphanage-home.webp" width="100%" alt="Home screen with current balance, income and expenses"></td>
    <td align="center" width="20%"><b>Records</b><br><sub>Income and expense list</sub><br><br><img src="https://raw.githubusercontent.com/celalcelikkaya/orphanage-manager/main/docs/screenshots/orphanage-records.webp" width="100%" alt="Records list with income and expenses"></td>
    <td align="center" width="20%"><b>Funds</b><br><sub>Transfers and exchange rates</sub><br><br><img src="https://raw.githubusercontent.com/celalcelikkaya/orphanage-manager/main/docs/screenshots/orphanage-funds.webp" width="100%" alt="Funds screen with transfers and exchange rates"></td>
    <td align="center" width="20%"><b>Changes</b><br><sub>Reasons, questions and answers</sub><br><br><img src="https://raw.githubusercontent.com/celalcelikkaya/orphanage-manager/main/docs/screenshots/orphanage-changes.webp" width="100%" alt="Changes screen with reasons, questions and answers"></td>
    <td align="center" width="20%"><b>Dark mode</b><br><sub>Home screen in dark theme</sub><br><br><img src="https://raw.githubusercontent.com/celalcelikkaya/orphanage-manager/main/docs/screenshots/orphanage-dark.webp" width="100%" alt="Home screen in dark mode"></td>
  </tr>
</table>

*Screenshots use sample data.*

---

## Default Login Credentials (After Setup)
When you run the initial setup, the system automatically creates default accounts with these credentials:
- **Admin:** `Admin` / Password: `admin123`
- **Girls Manager:** `Girls` / Password: `girls123`
- **Boys Manager:** `Boys` / Password: `boys123`

> **Important:** These passwords are only for your first login. Sign in as **Admin**, open the **Users** tab and tap **New password** for every account (the app generates the new password for you) before you share the web app link with anyone.

---

## Complete Installation & Deployment Guide

Follow these steps to set up and deploy the application from scratch.

**Get the files first:** [download the latest release](https://github.com/celalcelikkaya/orphanage-manager/releases/latest/download/orphanage-manager-main-v2.zip) and unzip it. It contains the four files you need: `Code.gs`, `Index.html`, `App1.html` and `App2.html`. (You can also copy them from this repository.)

### Step 1: Create a Google Apps Script Project
1. Go to [Google Apps Script](https://script.google.com/).
2. Click on **New project** in the top-left corner.
3. Rename your project to **Orphanage Manager**.

### Step 2: Add the Backend Code (`Code.gs`)
1. Replace the default code inside the automatically created `Code.gs` file with the provided backend script ([`app/Code.gs`](app/Code.gs) in this repository).
2. Save the project (`Ctrl + S` or click the disk icon).

### Step 3: Add Frontend Files (`Index`, `App1`, `App2`)
The application dynamically loads frontend parts using `bootApp(i)`. You must create these files in the exact order:
1. Click the **[+] (Add a file)** button at the top of the file list and select **HTML**.
2. Name the file **`Index`** (the `.html` extension is added automatically) and paste the contents of [`app/Index.html`](app/Index.html). Save it.
3. Add another HTML file named **`App1`** and paste the contents of [`app/App1.html`](app/App1.html). Save it.
4. Add another HTML file named **`App2`** and paste the contents of [`app/App2.html`](app/App2.html). Save it.

### Step 4: Run the Initial Setup & Grant Google Drive Permissions
1. In the top function dropdown menu (next to the Run button), select the **`setup`** function.
2. Click **Run**.
3. **Google Permission / Authorization Process:**
   - A window will pop up stating **"Authorization Required"**.
   - Click **Review permissions** and select your Google account.
   - You will see a security warning (*"Google hasn't verified this app"*). Click on the small **"Advanced"** link at the bottom left.
   - Click on **"Go to Orphanage Manager (unsafe)"** (this is a standard warning for self-written scripts running on your own account).
   - Click **Allow** to grant permissions.
4. Once executed successfully, a Google Sheets database named **"Orphanage Manager Data"** and a folder named **"Orphanage Photos"** will be automatically created in your Google Drive.

### Step 5: Deploy as a Web Application
1. In the top-right corner of the Apps Script editor, click **Deploy** > **New deployment**.
2. Click the gear icon next to *Select type* and choose **Web app**.
3. Fill in the deployment details:
   - **Description:** Orphanage Manager v1
   - **Execute as:** Me (your email)
   - **Who has access:** **Anyone** (Required so managers can log in from mobile devices or external browsers).
4. Click **Deploy**.
5. Copy the generated **Web app URL** and open it in your browser to start using the system.
