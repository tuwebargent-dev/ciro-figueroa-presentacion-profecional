import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- Configuración de Firebase ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // Reemplazar si es necesario
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "page-presupuesto", // Reemplazar con tu Project ID
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// --- Variables Globales ---
// Usar variables globales si están definidas, de lo contrario usar la configuración de arriba
const finalFirebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfig;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let db, auth;

try {
    const app = initializeApp(finalFirebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    await signInAnonymously(auth);
    console.log("Firebase inicializado y usuario anónimo autenticado.");
} catch (error) {
    console.error("Error inicializando Firebase:", error);
    // Mostrar un error al usuario si la inicialización falla
    const appContainer = document.getElementById('app-container');
    if(appContainer) {
         appContainer.innerHTML = `<p class="text-red-400 text-center">Error de conexión con la base de datos. Por favor, intente más tarde.</p>`;
    }
}


// --- Lógica de la Aplicación ---
const serviceTypeRadios = document.querySelectorAll('input[name="serviceType"]');
const webOptions = document.getElementById('web-options');
const cmOptions = document.getElementById('cm-options');
const serviceItems = document.querySelectorAll('.service-item');
const totalPriceEl = document.getElementById('total-price');
const submitButton = document.getElementById('submit-quote');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('email-error');
const successModal = document.getElementById('success-modal');
const closeModalButton = document.getElementById('close-modal');

const calculateTotal = () => {
    let total = 0;
    const selectedService = document.querySelector('input[name="serviceType"]:checked');

    if (!selectedService) {
        totalPriceEl.textContent = `USD $0`;
        return;
    }

    const container = selectedService.value === 'web' ? webOptions : cmOptions;
    const itemsInContainer = container.querySelectorAll('.service-item');

    itemsInContainer.forEach(item => {
        const price = parseFloat(item.dataset.price);
        if (item.type === 'checkbox' && item.checked) {
            total += price;
        }
        if (item.type === 'textarea' && item.value.trim() !== '') {
            total += price;
        }
    });

    totalPriceEl.textContent = `USD $${total.toLocaleString('en-US')}`;
};

const validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
};

const generateQuote = async () => {
    const email = emailInput.value;
    if (!validateEmail(email)) {
        emailError.classList.remove('hidden');
        emailInput.classList.add('border-red-500', 'ring-red-500');
        return;
    } else {
        emailError.classList.add('hidden');
        emailInput.classList.remove('border-red-500', 'ring-red-500');
    }
    
    const selectedServiceType = document.querySelector('input[name="serviceType"]:checked');
    if (!selectedServiceType) {
        // En lugar de alert, podrías mostrar un mensaje más estilizado.
        // Por ahora lo mantendremos simple.
        console.warn("Intento de generar cotización sin tipo de servicio.");
        return;
    }

    const container = selectedServiceType.value === 'web' ? webOptions : cmOptions;
    const itemsInContainer = container.querySelectorAll('.service-item');
    
    const selectedServices = [];
    let total = 0;

    itemsInContainer.forEach(item => {
        const price = parseFloat(item.dataset.price);
        if ((item.type === 'checkbox' && item.checked) || (item.type === 'textarea' && item.value.trim() !== '')) {
             total += price;
             let serviceName = '';
             if (item.type === 'textarea') {
                 serviceName = `Idea Personalizada: ${item.value.trim()}`;
             } else {
                 serviceName = item.parentElement.textContent.trim();
             }
             selectedServices.push({ name: serviceName, price: price });
        }
    });

    if (selectedServices.length === 0) {
        console.warn("Intento de generar cotización sin servicios seleccionados.");
        return;
    }

    const quoteData = {
        appId: appId,
        email: email,
        serviceType: selectedServiceType.value,
        services: selectedServices,
        total: total,
        createdAt: serverTimestamp()
    };

    // Guardar en Firestore
    try {
        // Usamos una colección pública para las cotizaciones
        const docRef = await addDoc(collection(db, `artifacts/${appId}/public/data/quotes`), quoteData);
        console.log("Cotización guardada con ID: ", docRef.id);
        console.log("Datos enviados:", quoteData);
        
        // Mostrar modal de éxito
        successModal.classList.remove('hidden');

    } catch (e) {
        console.error("Error al guardar la cotización: ", e);
        // Aquí también podrías mostrar un mensaje de error al usuario.
    }
};

// --- Event Listeners ---
serviceTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'web') {
            webOptions.classList.remove('hidden');
            cmOptions.classList.add('hidden');
        } else {
            webOptions.classList.add('hidden');
            cmOptions.classList.remove('hidden');
        }
        calculateTotal();
    });
});

serviceItems.forEach(item => {
    item.addEventListener('input', calculateTotal);
});

submitButton.addEventListener('click', generateQuote);

closeModalButton.addEventListener('click', () => {
     successModal.classList.add('hidden');
});
