import "dotenv/config"
import { createTransport } from "nodemailer";
import jwt from "jsonwebtoken"
import "dotenv/config"
import { getHTMLBienvenidaYCodigo } from "./bienvenidaCodigo.js";
// la direccion de destino se envia a un email temporal sacado de "https://tempail.com/"
const transporterGmail = createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD_APP,
    },
});
const createPasswordMessage = {
    from: process.env.GMAIL_USER,
    to: "",
    subject: "Te damos la bienvenida",
    text: "",
    html: ""
}
//Realiza el envio de email
// export const sendEmail = async (email, userId) => {
//     try {
//         const token = jwt.sign({userId}, process.env.SECRET_KEY_MAIL, {expiresIn: '24h'});
//         // Construir el link con el token como parametro
//         const linkDeConfiguracion = `https://preeminent-cajeta-b229d8.netlify.app/login?token=${token}`;
//         // Genera el contenido HTML con el enlace incluido
//         const htmlContent = getHTMLBienvenidaYPassword(linkDeConfiguracion);
//         createPasswordMessage.to = email;
//         createPasswordMessage.html = htmlContent;
//         const response = await transporterGmail.sendMail(createPasswordMessage);
//         return `Te llegara un mail a ${response.accepted}`
//     } catch (error) {
//         throw error
//     }
// }
export const sendEmailBienvenida = async (email, codigo) => {
    try {
        // Genera el contenido HTML con el enlace incluido
        const htmlContent = getHTMLBienvenidaYCodigo(codigo);
        createPasswordMessage.to = email;
        createPasswordMessage.html = htmlContent;
        const response = await transporterGmail.sendMail(createPasswordMessage);
        return `Te llegara un mail a ${response.accepted}`
    } catch (error) {
        throw error
    }
}
