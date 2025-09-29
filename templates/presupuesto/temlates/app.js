import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- Configuración de Firebase (Actualizada con tus datos correctos) ---
const firebaseConfig = {
    apiKey: "AIzaSyAMKzspq6eCcM6dctXpBGQSqkn1TxxcD8E",
    authDomain: "page-presupuesto.firebaseapp.com",
    projectId: "page-presupuesto",
    storageBucket: "page-presupuesto.firebasestorage.app", // Corregido según tu captura
    messagingSenderId: "373225945911",
    appId: "1:373225945911:web:b5a06df182e942ebc7b8b2",
    measurementId: "G-TENMTCD3XH"
};
// ----------------------------------------------------------------------

// --- Variables Globales ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
let db, auth;

try {
    // Usamos directamente tu configuración
    const app = initializeApp(firebaseConfig); 
    db = getFirestore(app);
    auth = getAuth(app);
    await signInAnonymously(auth);
    console.log("¡Conexión con Firebase exitosa! La configuración es correcta.");
    
    // Habilitamos el formulario una vez que la conexión es exitosa
    document.getElementById('app-container').style.opacity = '1';
    document.getElementById('app-container').style.pointerEvents = 'auto';

} catch (error) {
    console.error("Error inicializando Firebase:", error);
    const appContainer = document.getElementById('app-container');
    if(appContainer) {
         // Reemplazamos el contenido del formulario con el mensaje de error
         appContainer.innerHTML = `<div class="text-center p-4"><h2 class="text-xl font-bold mb-2 text-red-400">Error de Conexión</h2><p class="text-gray-300">No se pudo conectar a la base de datos. Verifica que los datos en la variable 'firebaseConfig' dentro de 'script.js' sean correctos y que tu proyecto de Firebase esté activo.</p></div>`;
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

    if (!db) {
        console.error("La base de datos no está inicializada. No se puede guardar la cotización.");
        return;
    }
    
    try {
        const docRef = await addDoc(collection(db, `artifacts/${appId}/public/data/quotes`), quoteData);
        console.log("Cotización guardada con ID: ", docRef.id);
        console.log("Datos enviados:", quoteData);
        
        successModal.classList.remove('hidden');

    } catch (e) {
        console.error("Error al guardar la cotización: ", e);
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


