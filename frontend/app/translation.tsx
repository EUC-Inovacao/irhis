import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "welcome": "Welcome back to",
      "signInPhrase": "Sign in to continue your rehabilitation journey",
      "Password": "Password",
      "SignIn": "Sign In",
      "PSignIn": "Sign In...",
      "NoAccount":"Don't have an account?",
      "Sign Up": "Sign Up",
      "Required":"Required",
      "RequiredMessage":"Please enter email and password.",
      "Login Failed":"Login Failed",
      "InvalidCredentials":"Invalid credentials.",
      "All required":"All fields are required.",
      "Birth date required":"Birth date is required for patient accounts.",
      "Valid email":"Please enter a valid email.",
      "PasswordLength":"Password must be at least 6 characters.",
      "Terms and Conditions":"You must accept the terms and conditions to continue.",
      "Privacy Notice":"You must accept the privacy notice to continue.",
      "PasswordMatch":"Passwords do not match.",
      "DateFormat":"Please enter a valid date in DD/MM/YYYY format.",
      "AccountFail":"Failed to create account. Please try again.",
      "Create Account":"Create Account",
      "Create Account Again":"Create a new account. Choose whether you're a doctor or patient.",
      "Account Type":"Account Type",
      "Patient": "Patient",
      "Doctor": "Doctor",
      "Full Name": "Nome Completo",
      "Enter full name":"Enter full name",
      "Enter password":"Enter password (min. 6 characters)"
    }
  },
  pt: {
    translation: {
      "welcome": "Bem-vindo de volta ao",
      "signInPhrase": "Inicie sessão para continuar a sua jornada de reabilitação",
      "Password": "Palavra passe",
      "SignIn": "Inicio de Sessão",
      "PSignIn": "Iniar sessão...",
       "NoAccount":"Não tem conta?",
       "Sign Up": "Criar conta",
       "Required": "Obrigatório",
       "RequiredMessage":"Por favor insira email e palavra passe",
       "Login Failed":"Falha no Login",
       "InvalidCredentials":"Credenciais Inválidas.",
       "All required": "Todos os campos são obrigatório.",
       "Birth date required":"A data de nascimento é obrigatória para contas de pacientes.",
       "Valid email":"Por favor introduza um email valido.",
       "PasswordLength":"A palavra passe deve ter pelo menos 6 caracteres.",
       "Terms and Conditions":"Tem que aceitar os termos e condições para continuar",
       "Privacy Notice":"Tem que aceitaro aviso de privacidade e consentimento para continuar.",
       "PasswordMatch":"Palavra passe não coincide.",
       "DateFormat":"Por favor insira uma data valida em formato: DD/MM/YYYY .",
       "AccountFail":"Falha ao criar conta. Por favor tente outra vez.",
       "Create Account":"Criar Conta",
       "Create Account Again":"Crie uma nova conta. Escolha entre doutor ou paciente.",
       "Account Type":"Tipo de conta",
       "Patient": "Paciente",
       "Doctor":"Doutor",
       "Full Name":"Nome Completo",
       "Enter full name": "Insira o nome completo",
       "Enter password":"Insira uma palavra passe (min. 6 caracters)"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt', // Idioma inicial
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;