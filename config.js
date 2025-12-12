// App Configuration - Easy to customize
const AppConfig = {
    // App Name & Branding
    APP_NAME: "EM Vault",
    APP_TAGLINE: "Premium Document Storage",
    COMPANY_NAME: "EM Tech Solutions",
    
    // Logo Configuration
    LOGO_TYPE: "icon", // "icon" or "image"
    LOGO_ICON: "fas fa-crown", // FontAwesome icon class
    LOGO_IMAGE_URL: "/IMG/BackgroundEraser_electromedics.png", // Leave empty for icon, or provide image URL
    LOGO_COLOR: "#ffd700", // Gold color for icons
    
    // Colors
    PRIMARY_COLOR: "#6a11cb",
    SECONDARY_COLOR: "#2575fc",
    ACCENT_COLOR: "#ffd700",
    SUCCESS_COLOR: "#00ff88",
    ERROR_COLOR: "#ff4757",
    
    // File Settings
    DEFAULT_MAX_SIZE: 1, // MB
    MAX_ALLOWED_SIZE: 10, // MB
    DEFAULT_CHUNK_SIZE: 256, // KB
    
    // Upload Settings
    MAX_PARALLEL_UPLOADS: 2,
    AUTO_UPLOAD: true,
    
    // Features
    ENABLE_SHARING: true,
    ENABLE_FILE_PREVIEW: true,
    ENABLE_SPEED_TEST: true,
    ENABLE_FILE_STATS: true,
    
    // Security
    PASSWORD_MIN_LENGTH: 6,
    SESSION_TIMEOUT: 30, // minutes (0 for no timeout)
    
    // UI Settings
    THEME: "dark", // "dark" or "light"
    ANIMATIONS: true,
    
    // Company Info
    COMPANY_WEBSITE: "https://EMvault.example.com",
    SUPPORT_EMAIL: "support@EMvault.example.com",
    VERSION: "1.0.0"
};

// Export for use in other files
window.AppConfig = AppConfig;

// Apply configuration on load
document.addEventListener('DOMContentLoaded', function() {
    // Set app name
    const appNameElements = document.querySelectorAll('#app-name, .app-name');
    appNameElements.forEach(el => {
        el.textContent = AppConfig.APP_NAME;
    });
    
    // Set app tagline
    const taglineElements = document.querySelectorAll('#app-tagline, .app-tagline');
    taglineElements.forEach(el => {
        el.textContent = AppConfig.APP_TAGLINE;
    });
    
    // Apply logo
    const logoIcons = document.querySelectorAll('.logo-icon');
    logoIcons.forEach(icon => {
        if (AppConfig.LOGO_TYPE === "image" && AppConfig.LOGO_IMAGE_URL) {
            icon.innerHTML = `<img src="${AppConfig.LOGO_IMAGE_URL}" alt="${AppConfig.APP_NAME}" style="width: 40px; height: 40px;">`;
        } else {
            icon.innerHTML = `<i class="${AppConfig.LOGO_ICON}" style="color: ${AppConfig.LOGO_COLOR};"></i>`;
        }
    });
    
    // Apply colors to CSS variables
    document.documentElement.style.setProperty('--primary-color', AppConfig.PRIMARY_COLOR);
    document.documentElement.style.setProperty('--secondary-color', AppConfig.SECONDARY_COLOR);
    document.documentElement.style.setProperty('--accent-color', AppConfig.ACCENT_COLOR);
    document.documentElement.style.setProperty('--success-color', AppConfig.SUCCESS_COLOR);
    document.documentElement.style.setProperty('--error-color', AppConfig.ERROR_COLOR);
});