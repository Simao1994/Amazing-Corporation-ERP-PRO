import emailjs from '@emailjs/browser';

// ----------------------------------------------------------------------------------
// CONFIGURAÇÃO DO EMAILJS
// ----------------------------------------------------------------------------------
// O Administrador do sistema deverá criar uma conta grátis em https://www.emailjs.com/
// e substituir estas credenciais para que os emails passem a ser enviados.
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID'; // Ex: 'service_abc123'
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID'; // Ex: 'template_xyz456'
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY'; // Ex: 'user_def7890'

export const enviarEmailCandidatura = async (
    candidateName: string,
    candidateEmail: string,
    vagaTitulo: string = 'Candidatura Espontânea'
) => {
    try {
        // Se as chaves ainda forem as default, não tenta enviar para evitar erros na consola para os utilizadores
        if (EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID') {
            console.log('EMAILJS: Email configurado, mas aguarda inserção das chaves (Service ID, Template ID, Public Key).');
            return false;
        }

        const templateParams = {
            to_name: candidateName,
            to_email: candidateEmail,
            vaga_titulo: vagaTitulo,
            message: `Olá ${candidateName}! 👋\n\nEsperamos que estejas a ter um excelente dia.\n\nRecebemos com enorme sucesso a tua candidatura para: ${vagaTitulo}. Ficamos muito felizes e agradecidos pelo teu interesse em fazer parte da nossa equipa!\n\nO teu perfil, currículo e experiência serão agora analisados com toda a atenção e carinho pela nossa equipa de Recrutamento e Cultura.\n\nPrometemos entrar em contacto assim que tivermos novidades sobre as próximas fases do processo.\n\nAté breve e muito sucesso na tua jornada! ✨\n\nCom os melhores cumprimentos,\nEquipa de Talentos e RH | Amazing Corporation`,
        };

        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams,
            EMAILJS_PUBLIC_KEY
        );
        
        console.log('EmailJS: Email enviado com sucesso!', response.status, response.text);
        return true;
    } catch (error) {
        console.error('EmailJS - Erro ao enviar email:', error);
        return false;
    }
};
