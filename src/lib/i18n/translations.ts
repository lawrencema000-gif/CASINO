export type Locale = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'ja' | 'zh' | 'ko' | 'ru' | 'ar'

export const SUPPORTED_LOCALES: { code: Locale; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
]

export const DEFAULT_LOCALE: Locale = 'en'

type TranslationKeys = {
  // Nav
  'nav.lobby': string
  'nav.games': string
  'nav.more': string
  'nav.login': string
  'nav.register': string
  'nav.profile': string
  'nav.wallet': string
  'nav.support': string
  'nav.tournaments': string
  'nav.leaderboards': string
  'nav.referrals': string
  // Common
  'common.play': string
  'common.bet': string
  'common.win': string
  'common.balance': string
  'common.loading': string
  'common.error': string
  'common.success': string
  'common.cancel': string
  'common.confirm': string
  'common.save': string
  'common.back': string
  'common.next': string
  'common.close': string
  'common.search': string
  'common.submit': string
  // Auth
  'auth.login': string
  'auth.register': string
  'auth.logout': string
  'auth.email': string
  'auth.password': string
  'auth.username': string
  'auth.forgot_password': string
  'auth.remember_me': string
  'auth.or_continue_with': string
  'auth.demo_mode': string
  'auth.no_account': string
  'auth.have_account': string
  // Games
  'games.slots': string
  'games.blackjack': string
  'games.roulette': string
  'games.poker': string
  'games.crash': string
  'games.plinko': string
  'games.dice': string
  'games.coinflip': string
  'games.mines': string
  'games.keno': string
  'games.limbo': string
  'games.hilo': string
  'games.lottery': string
  'games.jackpot': string
  'games.holdem': string
  'games.place_bet': string
  'games.cash_out': string
  'games.spin': string
  'games.deal': string
  'games.flip': string
  'games.roll': string
  'games.you_won': string
  'games.you_lost': string
  'games.bet_amount': string
  'games.auto_bet': string
  'games.max_bet': string
  'games.min_bet': string
  // Wallet
  'wallet.deposit': string
  'wallet.withdraw': string
  'wallet.history': string
  'wallet.add_funds': string
  // Footer
  'footer.terms': string
  'footer.privacy': string
  'footer.responsible_gambling': string
  'footer.provably_fair': string
  'footer.about': string
  'footer.faq': string
  'footer.gambling_warning': string
  // Responsible Gambling
  'rg.title': string
  'rg.session_timer': string
  'rg.loss_limit': string
  'rg.deposit_limit': string
  'rg.self_exclusion': string
  'rg.session_time_limit': string
  'rg.help_resources': string
  // Tournaments
  'tournament.title': string
  'tournament.join': string
  'tournament.entry_fee': string
  'tournament.prize_pool': string
  'tournament.leaderboard': string
  'tournament.live': string
  'tournament.upcoming': string
  'tournament.ended': string
  // Chat
  'chat.title': string
  'chat.placeholder': string
  'chat.online': string
}

type Translations = Record<Locale, TranslationKeys>

export const translations: Translations = {
  en: {
    'nav.lobby': 'Lobby',
    'nav.games': 'Games',
    'nav.more': 'More',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'nav.profile': 'Profile',
    'nav.wallet': 'Wallet',
    'nav.support': 'Support',
    'nav.tournaments': 'Tournaments',
    'nav.leaderboards': 'Leaderboards',
    'nav.referrals': 'Referrals',
    'common.play': 'Play',
    'common.bet': 'Bet',
    'common.win': 'Win',
    'common.balance': 'Balance',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.submit': 'Submit',
    'auth.login': 'Sign In',
    'auth.register': 'Create Account',
    'auth.logout': 'Sign Out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.username': 'Username',
    'auth.forgot_password': 'Forgot password?',
    'auth.remember_me': 'Remember me',
    'auth.or_continue_with': 'Or continue with',
    'auth.demo_mode': 'Play in Demo Mode',
    'auth.no_account': "Don't have an account?",
    'auth.have_account': 'Already have an account?',
    'games.slots': 'Slots',
    'games.blackjack': 'Blackjack',
    'games.roulette': 'Roulette',
    'games.poker': 'Video Poker',
    'games.crash': 'Crash',
    'games.plinko': 'Plinko',
    'games.dice': 'Dice',
    'games.coinflip': 'Coin Flip',
    'games.mines': 'Mines',
    'games.keno': 'Keno',
    'games.limbo': 'Limbo',
    'games.hilo': 'Hi-Lo',
    'games.lottery': 'Lottery',
    'games.jackpot': 'Jackpot',
    'games.holdem': "Hold'em",
    'games.place_bet': 'Place Bet',
    'games.cash_out': 'Cash Out',
    'games.spin': 'Spin',
    'games.deal': 'Deal',
    'games.flip': 'Flip',
    'games.roll': 'Roll',
    'games.you_won': 'You Won!',
    'games.you_lost': 'You Lost',
    'games.bet_amount': 'Bet Amount',
    'games.auto_bet': 'Auto Bet',
    'games.max_bet': 'Max',
    'games.min_bet': 'Min',
    'wallet.deposit': 'Deposit',
    'wallet.withdraw': 'Withdraw',
    'wallet.history': 'Transaction History',
    'wallet.add_funds': 'Add Funds',
    'footer.terms': 'Terms of Service',
    'footer.privacy': 'Privacy Policy',
    'footer.responsible_gambling': 'Responsible Gambling',
    'footer.provably_fair': 'Provably Fair',
    'footer.about': 'About',
    'footer.faq': 'FAQ',
    'footer.gambling_warning': 'Gambling can be addictive. Please play responsibly.',
    'rg.title': 'Responsible Gambling',
    'rg.session_timer': 'Current Session',
    'rg.loss_limit': 'Daily Loss Limit',
    'rg.deposit_limit': 'Daily Deposit Limit',
    'rg.self_exclusion': 'Self-Exclusion',
    'rg.session_time_limit': 'Session Time Limit',
    'rg.help_resources': 'Help & Resources',
    'tournament.title': 'Tournaments',
    'tournament.join': 'Join Tournament',
    'tournament.entry_fee': 'Entry Fee',
    'tournament.prize_pool': 'Prize Pool',
    'tournament.leaderboard': 'Leaderboard',
    'tournament.live': 'Live',
    'tournament.upcoming': 'Upcoming',
    'tournament.ended': 'Ended',
    'chat.title': 'Fortuna Support',
    'chat.placeholder': 'Type a message...',
    'chat.online': 'Online',
  },
  es: {
    'nav.lobby': 'Lobby',
    'nav.games': 'Juegos',
    'nav.more': 'Más',
    'nav.login': 'Iniciar Sesión',
    'nav.register': 'Registrarse',
    'nav.profile': 'Perfil',
    'nav.wallet': 'Cartera',
    'nav.support': 'Soporte',
    'nav.tournaments': 'Torneos',
    'nav.leaderboards': 'Clasificaciones',
    'nav.referrals': 'Referidos',
    'common.play': 'Jugar',
    'common.bet': 'Apostar',
    'common.win': 'Ganar',
    'common.balance': 'Saldo',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.save': 'Guardar',
    'common.back': 'Atrás',
    'common.next': 'Siguiente',
    'common.close': 'Cerrar',
    'common.search': 'Buscar',
    'common.submit': 'Enviar',
    'auth.login': 'Iniciar Sesión',
    'auth.register': 'Crear Cuenta',
    'auth.logout': 'Cerrar Sesión',
    'auth.email': 'Correo Electrónico',
    'auth.password': 'Contraseña',
    'auth.username': 'Nombre de Usuario',
    'auth.forgot_password': '¿Olvidaste tu contraseña?',
    'auth.remember_me': 'Recordarme',
    'auth.or_continue_with': 'O continuar con',
    'auth.demo_mode': 'Jugar en Modo Demo',
    'auth.no_account': '¿No tienes cuenta?',
    'auth.have_account': '¿Ya tienes cuenta?',
    'games.slots': 'Tragamonedas',
    'games.blackjack': 'Blackjack',
    'games.roulette': 'Ruleta',
    'games.poker': 'Video Póker',
    'games.crash': 'Crash',
    'games.plinko': 'Plinko',
    'games.dice': 'Dados',
    'games.coinflip': 'Lanzar Moneda',
    'games.mines': 'Minas',
    'games.keno': 'Keno',
    'games.limbo': 'Limbo',
    'games.hilo': 'Hi-Lo',
    'games.lottery': 'Lotería',
    'games.jackpot': 'Jackpot',
    'games.holdem': "Hold'em",
    'games.place_bet': 'Realizar Apuesta',
    'games.cash_out': 'Retirar',
    'games.spin': 'Girar',
    'games.deal': 'Repartir',
    'games.flip': 'Lanzar',
    'games.roll': 'Tirar',
    'games.you_won': '¡Ganaste!',
    'games.you_lost': 'Perdiste',
    'games.bet_amount': 'Cantidad de Apuesta',
    'games.auto_bet': 'Apuesta Automática',
    'games.max_bet': 'Máx',
    'games.min_bet': 'Mín',
    'wallet.deposit': 'Depositar',
    'wallet.withdraw': 'Retirar',
    'wallet.history': 'Historial de Transacciones',
    'wallet.add_funds': 'Agregar Fondos',
    'footer.terms': 'Términos de Servicio',
    'footer.privacy': 'Política de Privacidad',
    'footer.responsible_gambling': 'Juego Responsable',
    'footer.provably_fair': 'Demostrablemente Justo',
    'footer.about': 'Acerca de',
    'footer.faq': 'FAQ',
    'footer.gambling_warning': 'El juego puede ser adictivo. Juega responsablemente.',
    'rg.title': 'Juego Responsable',
    'rg.session_timer': 'Sesión Actual',
    'rg.loss_limit': 'Límite de Pérdida Diaria',
    'rg.deposit_limit': 'Límite de Depósito Diario',
    'rg.self_exclusion': 'Autoexclusión',
    'rg.session_time_limit': 'Límite de Tiempo de Sesión',
    'rg.help_resources': 'Ayuda y Recursos',
    'tournament.title': 'Torneos',
    'tournament.join': 'Unirse al Torneo',
    'tournament.entry_fee': 'Cuota de Entrada',
    'tournament.prize_pool': 'Pozo de Premios',
    'tournament.leaderboard': 'Clasificación',
    'tournament.live': 'En Vivo',
    'tournament.upcoming': 'Próximo',
    'tournament.ended': 'Finalizado',
    'chat.title': 'Soporte Fortuna',
    'chat.placeholder': 'Escribe un mensaje...',
    'chat.online': 'En línea',
  },
  pt: {
    'nav.lobby': 'Lobby',
    'nav.games': 'Jogos',
    'nav.more': 'Mais',
    'nav.login': 'Entrar',
    'nav.register': 'Registrar',
    'nav.profile': 'Perfil',
    'nav.wallet': 'Carteira',
    'nav.support': 'Suporte',
    'nav.tournaments': 'Torneios',
    'nav.leaderboards': 'Classificações',
    'nav.referrals': 'Indicações',
    'common.play': 'Jogar',
    'common.bet': 'Apostar',
    'common.win': 'Ganhar',
    'common.balance': 'Saldo',
    'common.loading': 'Carregando...',
    'common.error': 'Erro',
    'common.success': 'Sucesso',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.save': 'Salvar',
    'common.back': 'Voltar',
    'common.next': 'Próximo',
    'common.close': 'Fechar',
    'common.search': 'Buscar',
    'common.submit': 'Enviar',
    'auth.login': 'Entrar',
    'auth.register': 'Criar Conta',
    'auth.logout': 'Sair',
    'auth.email': 'E-mail',
    'auth.password': 'Senha',
    'auth.username': 'Nome de Usuário',
    'auth.forgot_password': 'Esqueceu a senha?',
    'auth.remember_me': 'Lembrar de mim',
    'auth.or_continue_with': 'Ou continue com',
    'auth.demo_mode': 'Jogar em Modo Demo',
    'auth.no_account': 'Não tem conta?',
    'auth.have_account': 'Já tem conta?',
    'games.slots': 'Caça-Níqueis',
    'games.blackjack': 'Blackjack',
    'games.roulette': 'Roleta',
    'games.poker': 'Vídeo Pôquer',
    'games.crash': 'Crash',
    'games.plinko': 'Plinko',
    'games.dice': 'Dados',
    'games.coinflip': 'Cara ou Coroa',
    'games.mines': 'Minas',
    'games.keno': 'Keno',
    'games.limbo': 'Limbo',
    'games.hilo': 'Hi-Lo',
    'games.lottery': 'Loteria',
    'games.jackpot': 'Jackpot',
    'games.holdem': "Hold'em",
    'games.place_bet': 'Fazer Aposta',
    'games.cash_out': 'Sacar',
    'games.spin': 'Girar',
    'games.deal': 'Distribuir',
    'games.flip': 'Lançar',
    'games.roll': 'Rolar',
    'games.you_won': 'Você Ganhou!',
    'games.you_lost': 'Você Perdeu',
    'games.bet_amount': 'Valor da Aposta',
    'games.auto_bet': 'Aposta Automática',
    'games.max_bet': 'Máx',
    'games.min_bet': 'Mín',
    'wallet.deposit': 'Depositar',
    'wallet.withdraw': 'Sacar',
    'wallet.history': 'Histórico de Transações',
    'wallet.add_funds': 'Adicionar Fundos',
    'footer.terms': 'Termos de Serviço',
    'footer.privacy': 'Política de Privacidade',
    'footer.responsible_gambling': 'Jogo Responsável',
    'footer.provably_fair': 'Comprovadamente Justo',
    'footer.about': 'Sobre',
    'footer.faq': 'FAQ',
    'footer.gambling_warning': 'Jogos de azar podem ser viciantes. Jogue com responsabilidade.',
    'rg.title': 'Jogo Responsável',
    'rg.session_timer': 'Sessão Atual',
    'rg.loss_limit': 'Limite de Perda Diária',
    'rg.deposit_limit': 'Limite de Depósito Diário',
    'rg.self_exclusion': 'Autoexclusão',
    'rg.session_time_limit': 'Limite de Tempo de Sessão',
    'rg.help_resources': 'Ajuda e Recursos',
    'tournament.title': 'Torneios',
    'tournament.join': 'Participar do Torneio',
    'tournament.entry_fee': 'Taxa de Entrada',
    'tournament.prize_pool': 'Prêmio Total',
    'tournament.leaderboard': 'Classificação',
    'tournament.live': 'Ao Vivo',
    'tournament.upcoming': 'Em Breve',
    'tournament.ended': 'Encerrado',
    'chat.title': 'Suporte Fortuna',
    'chat.placeholder': 'Digite uma mensagem...',
    'chat.online': 'Online',
  },
  fr: {
    'nav.lobby': 'Lobby', 'nav.games': 'Jeux', 'nav.more': 'Plus', 'nav.login': 'Connexion', 'nav.register': "S'inscrire", 'nav.profile': 'Profil', 'nav.wallet': 'Portefeuille', 'nav.support': 'Support', 'nav.tournaments': 'Tournois', 'nav.leaderboards': 'Classements', 'nav.referrals': 'Parrainages',
    'common.play': 'Jouer', 'common.bet': 'Miser', 'common.win': 'Gagner', 'common.balance': 'Solde', 'common.loading': 'Chargement...', 'common.error': 'Erreur', 'common.success': 'Succès', 'common.cancel': 'Annuler', 'common.confirm': 'Confirmer', 'common.save': 'Sauvegarder', 'common.back': 'Retour', 'common.next': 'Suivant', 'common.close': 'Fermer', 'common.search': 'Rechercher', 'common.submit': 'Envoyer',
    'auth.login': 'Se Connecter', 'auth.register': 'Créer un Compte', 'auth.logout': 'Se Déconnecter', 'auth.email': 'E-mail', 'auth.password': 'Mot de Passe', 'auth.username': "Nom d'Utilisateur", 'auth.forgot_password': 'Mot de passe oublié?', 'auth.remember_me': 'Se souvenir de moi', 'auth.or_continue_with': 'Ou continuer avec', 'auth.demo_mode': 'Jouer en Mode Démo', 'auth.no_account': "Pas de compte?", 'auth.have_account': 'Déjà un compte?',
    'games.slots': 'Machines à Sous', 'games.blackjack': 'Blackjack', 'games.roulette': 'Roulette', 'games.poker': 'Vidéo Poker', 'games.crash': 'Crash', 'games.plinko': 'Plinko', 'games.dice': 'Dés', 'games.coinflip': 'Pile ou Face', 'games.mines': 'Mines', 'games.keno': 'Keno', 'games.limbo': 'Limbo', 'games.hilo': 'Hi-Lo', 'games.lottery': 'Loterie', 'games.jackpot': 'Jackpot', 'games.holdem': "Hold'em",
    'games.place_bet': 'Placer un Pari', 'games.cash_out': 'Retirer', 'games.spin': 'Tourner', 'games.deal': 'Distribuer', 'games.flip': 'Lancer', 'games.roll': 'Lancer', 'games.you_won': 'Vous avez gagné!', 'games.you_lost': 'Vous avez perdu', 'games.bet_amount': 'Montant du Pari', 'games.auto_bet': 'Pari Auto', 'games.max_bet': 'Max', 'games.min_bet': 'Min',
    'wallet.deposit': 'Déposer', 'wallet.withdraw': 'Retirer', 'wallet.history': 'Historique des Transactions', 'wallet.add_funds': 'Ajouter des Fonds',
    'footer.terms': "Conditions d'Utilisation", 'footer.privacy': 'Politique de Confidentialité', 'footer.responsible_gambling': 'Jeu Responsable', 'footer.provably_fair': 'Prouvablement Équitable', 'footer.about': 'À Propos', 'footer.faq': 'FAQ', 'footer.gambling_warning': 'Le jeu peut être addictif. Jouez de manière responsable.',
    'rg.title': 'Jeu Responsable', 'rg.session_timer': 'Session Actuelle', 'rg.loss_limit': 'Limite de Perte Quotidienne', 'rg.deposit_limit': 'Limite de Dépôt Quotidien', 'rg.self_exclusion': 'Auto-Exclusion', 'rg.session_time_limit': 'Limite de Temps de Session', 'rg.help_resources': 'Aide et Ressources',
    'tournament.title': 'Tournois', 'tournament.join': 'Rejoindre le Tournoi', 'tournament.entry_fee': "Frais d'Entrée", 'tournament.prize_pool': 'Cagnotte', 'tournament.leaderboard': 'Classement', 'tournament.live': 'En Direct', 'tournament.upcoming': 'À Venir', 'tournament.ended': 'Terminé',
    'chat.title': 'Support Fortuna', 'chat.placeholder': 'Tapez un message...', 'chat.online': 'En ligne',
  },
  de: {
    'nav.lobby': 'Lobby', 'nav.games': 'Spiele', 'nav.more': 'Mehr', 'nav.login': 'Anmelden', 'nav.register': 'Registrieren', 'nav.profile': 'Profil', 'nav.wallet': 'Geldbörse', 'nav.support': 'Support', 'nav.tournaments': 'Turniere', 'nav.leaderboards': 'Ranglisten', 'nav.referrals': 'Empfehlungen',
    'common.play': 'Spielen', 'common.bet': 'Wetten', 'common.win': 'Gewinnen', 'common.balance': 'Guthaben', 'common.loading': 'Laden...', 'common.error': 'Fehler', 'common.success': 'Erfolg', 'common.cancel': 'Abbrechen', 'common.confirm': 'Bestätigen', 'common.save': 'Speichern', 'common.back': 'Zurück', 'common.next': 'Weiter', 'common.close': 'Schließen', 'common.search': 'Suchen', 'common.submit': 'Absenden',
    'auth.login': 'Anmelden', 'auth.register': 'Konto Erstellen', 'auth.logout': 'Abmelden', 'auth.email': 'E-Mail', 'auth.password': 'Passwort', 'auth.username': 'Benutzername', 'auth.forgot_password': 'Passwort vergessen?', 'auth.remember_me': 'Angemeldet bleiben', 'auth.or_continue_with': 'Oder fortfahren mit', 'auth.demo_mode': 'Im Demo-Modus Spielen', 'auth.no_account': 'Kein Konto?', 'auth.have_account': 'Bereits ein Konto?',
    'games.slots': 'Spielautomaten', 'games.blackjack': 'Blackjack', 'games.roulette': 'Roulette', 'games.poker': 'Video Poker', 'games.crash': 'Crash', 'games.plinko': 'Plinko', 'games.dice': 'Würfel', 'games.coinflip': 'Münzwurf', 'games.mines': 'Minen', 'games.keno': 'Keno', 'games.limbo': 'Limbo', 'games.hilo': 'Hi-Lo', 'games.lottery': 'Lotterie', 'games.jackpot': 'Jackpot', 'games.holdem': "Hold'em",
    'games.place_bet': 'Wette Platzieren', 'games.cash_out': 'Auszahlen', 'games.spin': 'Drehen', 'games.deal': 'Austeilen', 'games.flip': 'Werfen', 'games.roll': 'Würfeln', 'games.you_won': 'Du hast Gewonnen!', 'games.you_lost': 'Du hast Verloren', 'games.bet_amount': 'Einsatzbetrag', 'games.auto_bet': 'Auto Wette', 'games.max_bet': 'Max', 'games.min_bet': 'Min',
    'wallet.deposit': 'Einzahlen', 'wallet.withdraw': 'Abheben', 'wallet.history': 'Transaktionsverlauf', 'wallet.add_funds': 'Geld Hinzufügen',
    'footer.terms': 'Nutzungsbedingungen', 'footer.privacy': 'Datenschutzrichtlinie', 'footer.responsible_gambling': 'Verantwortungsvolles Spielen', 'footer.provably_fair': 'Nachweislich Fair', 'footer.about': 'Über Uns', 'footer.faq': 'FAQ', 'footer.gambling_warning': 'Glücksspiel kann süchtig machen. Bitte spielen Sie verantwortungsvoll.',
    'rg.title': 'Verantwortungsvolles Spielen', 'rg.session_timer': 'Aktuelle Sitzung', 'rg.loss_limit': 'Tägliches Verlustlimit', 'rg.deposit_limit': 'Tägliches Einzahlungslimit', 'rg.self_exclusion': 'Selbstausschluss', 'rg.session_time_limit': 'Sitzungszeitlimit', 'rg.help_resources': 'Hilfe & Ressourcen',
    'tournament.title': 'Turniere', 'tournament.join': 'Turnier Beitreten', 'tournament.entry_fee': 'Startgebühr', 'tournament.prize_pool': 'Preispool', 'tournament.leaderboard': 'Rangliste', 'tournament.live': 'Live', 'tournament.upcoming': 'Demnächst', 'tournament.ended': 'Beendet',
    'chat.title': 'Fortuna Support', 'chat.placeholder': 'Nachricht eingeben...', 'chat.online': 'Online',
  },
  ja: {
    'nav.lobby': 'ロビー', 'nav.games': 'ゲーム', 'nav.more': 'もっと', 'nav.login': 'ログイン', 'nav.register': '登録', 'nav.profile': 'プロフィール', 'nav.wallet': 'ウォレット', 'nav.support': 'サポート', 'nav.tournaments': 'トーナメント', 'nav.leaderboards': 'ランキング', 'nav.referrals': '紹介',
    'common.play': 'プレイ', 'common.bet': 'ベット', 'common.win': '勝利', 'common.balance': '残高', 'common.loading': '読み込み中...', 'common.error': 'エラー', 'common.success': '成功', 'common.cancel': 'キャンセル', 'common.confirm': '確認', 'common.save': '保存', 'common.back': '戻る', 'common.next': '次へ', 'common.close': '閉じる', 'common.search': '検索', 'common.submit': '送信',
    'auth.login': 'サインイン', 'auth.register': 'アカウント作成', 'auth.logout': 'サインアウト', 'auth.email': 'メール', 'auth.password': 'パスワード', 'auth.username': 'ユーザー名', 'auth.forgot_password': 'パスワードを忘れた？', 'auth.remember_me': 'ログイン状態を保持', 'auth.or_continue_with': 'または次で続行', 'auth.demo_mode': 'デモモードでプレイ', 'auth.no_account': 'アカウントがない？', 'auth.have_account': 'アカウントをお持ちですか？',
    'games.slots': 'スロット', 'games.blackjack': 'ブラックジャック', 'games.roulette': 'ルーレット', 'games.poker': 'ビデオポーカー', 'games.crash': 'クラッシュ', 'games.plinko': 'プリンコ', 'games.dice': 'ダイス', 'games.coinflip': 'コインフリップ', 'games.mines': 'マインズ', 'games.keno': 'キノ', 'games.limbo': 'リンボ', 'games.hilo': 'ハイロー', 'games.lottery': 'ロッタリー', 'games.jackpot': 'ジャックポット', 'games.holdem': "ホールデム",
    'games.place_bet': 'ベットする', 'games.cash_out': 'キャッシュアウト', 'games.spin': 'スピン', 'games.deal': 'ディール', 'games.flip': 'フリップ', 'games.roll': 'ロール', 'games.you_won': '勝ちました！', 'games.you_lost': '負けました', 'games.bet_amount': 'ベット額', 'games.auto_bet': 'オートベット', 'games.max_bet': '最大', 'games.min_bet': '最小',
    'wallet.deposit': '入金', 'wallet.withdraw': '出金', 'wallet.history': '取引履歴', 'wallet.add_funds': '資金追加',
    'footer.terms': '利用規約', 'footer.privacy': 'プライバシーポリシー', 'footer.responsible_gambling': '責任あるギャンブル', 'footer.provably_fair': '公正性の証明', 'footer.about': 'について', 'footer.faq': 'よくある質問', 'footer.gambling_warning': 'ギャンブルは中毒性があります。責任を持ってプレイしてください。',
    'rg.title': '責任あるギャンブル', 'rg.session_timer': '現在のセッション', 'rg.loss_limit': '1日の損失限度', 'rg.deposit_limit': '1日の入金限度', 'rg.self_exclusion': '自己除外', 'rg.session_time_limit': 'セッション時間制限', 'rg.help_resources': 'ヘルプとリソース',
    'tournament.title': 'トーナメント', 'tournament.join': 'トーナメントに参加', 'tournament.entry_fee': '参加費', 'tournament.prize_pool': '賞金プール', 'tournament.leaderboard': 'リーダーボード', 'tournament.live': 'ライブ', 'tournament.upcoming': '近日開催', 'tournament.ended': '終了',
    'chat.title': 'フォーチュナサポート', 'chat.placeholder': 'メッセージを入力...', 'chat.online': 'オンライン',
  },
  zh: {
    'nav.lobby': '大厅', 'nav.games': '游戏', 'nav.more': '更多', 'nav.login': '登录', 'nav.register': '注册', 'nav.profile': '个人资料', 'nav.wallet': '钱包', 'nav.support': '客服', 'nav.tournaments': '锦标赛', 'nav.leaderboards': '排行榜', 'nav.referrals': '推荐',
    'common.play': '开始', 'common.bet': '下注', 'common.win': '赢', 'common.balance': '余额', 'common.loading': '加载中...', 'common.error': '错误', 'common.success': '成功', 'common.cancel': '取消', 'common.confirm': '确认', 'common.save': '保存', 'common.back': '返回', 'common.next': '下一步', 'common.close': '关闭', 'common.search': '搜索', 'common.submit': '提交',
    'auth.login': '登录', 'auth.register': '创建账户', 'auth.logout': '退出', 'auth.email': '邮箱', 'auth.password': '密码', 'auth.username': '用户名', 'auth.forgot_password': '忘记密码？', 'auth.remember_me': '记住我', 'auth.or_continue_with': '或者通过以下方式继续', 'auth.demo_mode': '演示模式', 'auth.no_account': '没有账户？', 'auth.have_account': '已有账户？',
    'games.slots': '老虎机', 'games.blackjack': '二十一点', 'games.roulette': '轮盘', 'games.poker': '视频扑克', 'games.crash': '飞机', 'games.plinko': '弹珠', 'games.dice': '骰子', 'games.coinflip': '抛硬币', 'games.mines': '扫雷', 'games.keno': '基诺', 'games.limbo': '林波', 'games.hilo': '高低', 'games.lottery': '彩票', 'games.jackpot': '头奖', 'games.holdem': "德州",
    'games.place_bet': '下注', 'games.cash_out': '提现', 'games.spin': '旋转', 'games.deal': '发牌', 'games.flip': '翻转', 'games.roll': '掷骰', 'games.you_won': '你赢了！', 'games.you_lost': '你输了', 'games.bet_amount': '投注金额', 'games.auto_bet': '自动投注', 'games.max_bet': '最大', 'games.min_bet': '最小',
    'wallet.deposit': '充值', 'wallet.withdraw': '提现', 'wallet.history': '交易记录', 'wallet.add_funds': '添加资金',
    'footer.terms': '服务条款', 'footer.privacy': '隐私政策', 'footer.responsible_gambling': '负责任博彩', 'footer.provably_fair': '可证公平', 'footer.about': '关于', 'footer.faq': '常见问题', 'footer.gambling_warning': '博彩可能令人上瘾。请负责任地游戏。',
    'rg.title': '负责任博彩', 'rg.session_timer': '当前会话', 'rg.loss_limit': '每日亏损限额', 'rg.deposit_limit': '每日充值限额', 'rg.self_exclusion': '自我排除', 'rg.session_time_limit': '会话时间限制', 'rg.help_resources': '帮助与资源',
    'tournament.title': '锦标赛', 'tournament.join': '加入锦标赛', 'tournament.entry_fee': '报名费', 'tournament.prize_pool': '奖金池', 'tournament.leaderboard': '排行榜', 'tournament.live': '进行中', 'tournament.upcoming': '即将开始', 'tournament.ended': '已结束',
    'chat.title': '福运客服', 'chat.placeholder': '输入消息...', 'chat.online': '在线',
  },
  ko: {
    'nav.lobby': '로비', 'nav.games': '게임', 'nav.more': '더보기', 'nav.login': '로그인', 'nav.register': '회원가입', 'nav.profile': '프로필', 'nav.wallet': '지갑', 'nav.support': '고객지원', 'nav.tournaments': '토너먼트', 'nav.leaderboards': '순위표', 'nav.referrals': '추천',
    'common.play': '플레이', 'common.bet': '베팅', 'common.win': '승리', 'common.balance': '잔액', 'common.loading': '로딩...', 'common.error': '오류', 'common.success': '성공', 'common.cancel': '취소', 'common.confirm': '확인', 'common.save': '저장', 'common.back': '뒤로', 'common.next': '다음', 'common.close': '닫기', 'common.search': '검색', 'common.submit': '제출',
    'auth.login': '로그인', 'auth.register': '계정 만들기', 'auth.logout': '로그아웃', 'auth.email': '이메일', 'auth.password': '비밀번호', 'auth.username': '사용자명', 'auth.forgot_password': '비밀번호를 잊으셨나요?', 'auth.remember_me': '로그인 유지', 'auth.or_continue_with': '또는 다음으로 계속', 'auth.demo_mode': '데모 모드로 플레이', 'auth.no_account': '계정이 없으신가요?', 'auth.have_account': '이미 계정이 있으신가요?',
    'games.slots': '슬롯', 'games.blackjack': '블랙잭', 'games.roulette': '룰렛', 'games.poker': '비디오 포커', 'games.crash': '크래시', 'games.plinko': '플링코', 'games.dice': '주사위', 'games.coinflip': '동전 던지기', 'games.mines': '마인즈', 'games.keno': '키노', 'games.limbo': '림보', 'games.hilo': '하이로', 'games.lottery': '복권', 'games.jackpot': '잭팟', 'games.holdem': "홀덤",
    'games.place_bet': '베팅하기', 'games.cash_out': '캐시아웃', 'games.spin': '스핀', 'games.deal': '딜', 'games.flip': '플립', 'games.roll': '롤', 'games.you_won': '승리!', 'games.you_lost': '패배', 'games.bet_amount': '베팅 금액', 'games.auto_bet': '자동 베팅', 'games.max_bet': '최대', 'games.min_bet': '최소',
    'wallet.deposit': '입금', 'wallet.withdraw': '출금', 'wallet.history': '거래 내역', 'wallet.add_funds': '자금 추가',
    'footer.terms': '이용약관', 'footer.privacy': '개인정보 처리방침', 'footer.responsible_gambling': '책임감 있는 도박', 'footer.provably_fair': '공정성 증명', 'footer.about': '소개', 'footer.faq': 'FAQ', 'footer.gambling_warning': '도박은 중독성이 있습니다. 책임감 있게 플레이하세요.',
    'rg.title': '책임감 있는 도박', 'rg.session_timer': '현재 세션', 'rg.loss_limit': '일일 손실 한도', 'rg.deposit_limit': '일일 입금 한도', 'rg.self_exclusion': '자기 배제', 'rg.session_time_limit': '세션 시간 제한', 'rg.help_resources': '도움말 및 리소스',
    'tournament.title': '토너먼트', 'tournament.join': '토너먼트 참가', 'tournament.entry_fee': '참가비', 'tournament.prize_pool': '상금 풀', 'tournament.leaderboard': '순위표', 'tournament.live': '진행중', 'tournament.upcoming': '예정', 'tournament.ended': '종료',
    'chat.title': '포르투나 고객지원', 'chat.placeholder': '메시지 입력...', 'chat.online': '온라인',
  },
  ru: {
    'nav.lobby': 'Лобби', 'nav.games': 'Игры', 'nav.more': 'Ещё', 'nav.login': 'Вход', 'nav.register': 'Регистрация', 'nav.profile': 'Профиль', 'nav.wallet': 'Кошелёк', 'nav.support': 'Поддержка', 'nav.tournaments': 'Турниры', 'nav.leaderboards': 'Рейтинги', 'nav.referrals': 'Рефералы',
    'common.play': 'Играть', 'common.bet': 'Ставка', 'common.win': 'Выигрыш', 'common.balance': 'Баланс', 'common.loading': 'Загрузка...', 'common.error': 'Ошибка', 'common.success': 'Успех', 'common.cancel': 'Отмена', 'common.confirm': 'Подтвердить', 'common.save': 'Сохранить', 'common.back': 'Назад', 'common.next': 'Далее', 'common.close': 'Закрыть', 'common.search': 'Поиск', 'common.submit': 'Отправить',
    'auth.login': 'Войти', 'auth.register': 'Создать Аккаунт', 'auth.logout': 'Выйти', 'auth.email': 'Email', 'auth.password': 'Пароль', 'auth.username': 'Имя пользователя', 'auth.forgot_password': 'Забыли пароль?', 'auth.remember_me': 'Запомнить меня', 'auth.or_continue_with': 'Или продолжить с', 'auth.demo_mode': 'Играть в Демо Режиме', 'auth.no_account': 'Нет аккаунта?', 'auth.have_account': 'Уже есть аккаунт?',
    'games.slots': 'Слоты', 'games.blackjack': 'Блэкджек', 'games.roulette': 'Рулетка', 'games.poker': 'Видео Покер', 'games.crash': 'Краш', 'games.plinko': 'Плинко', 'games.dice': 'Кости', 'games.coinflip': 'Монетка', 'games.mines': 'Мины', 'games.keno': 'Кено', 'games.limbo': 'Лимбо', 'games.hilo': 'Хай-Ло', 'games.lottery': 'Лотерея', 'games.jackpot': 'Джекпот', 'games.holdem': "Холдем",
    'games.place_bet': 'Сделать Ставку', 'games.cash_out': 'Вывести', 'games.spin': 'Крутить', 'games.deal': 'Раздать', 'games.flip': 'Бросить', 'games.roll': 'Бросить', 'games.you_won': 'Вы выиграли!', 'games.you_lost': 'Вы проиграли', 'games.bet_amount': 'Сумма ставки', 'games.auto_bet': 'Авто Ставка', 'games.max_bet': 'Макс', 'games.min_bet': 'Мин',
    'wallet.deposit': 'Пополнить', 'wallet.withdraw': 'Вывести', 'wallet.history': 'История Транзакций', 'wallet.add_funds': 'Добавить Средства',
    'footer.terms': 'Условия Использования', 'footer.privacy': 'Политика Конфиденциальности', 'footer.responsible_gambling': 'Ответственная Игра', 'footer.provably_fair': 'Доказуемо Честно', 'footer.about': 'О Нас', 'footer.faq': 'FAQ', 'footer.gambling_warning': 'Азартные игры могут вызывать зависимость. Играйте ответственно.',
    'rg.title': 'Ответственная Игра', 'rg.session_timer': 'Текущая Сессия', 'rg.loss_limit': 'Дневной Лимит Проигрыша', 'rg.deposit_limit': 'Дневной Лимит Депозита', 'rg.self_exclusion': 'Самоисключение', 'rg.session_time_limit': 'Лимит Времени Сессии', 'rg.help_resources': 'Помощь и Ресурсы',
    'tournament.title': 'Турниры', 'tournament.join': 'Присоединиться к Турниру', 'tournament.entry_fee': 'Вступительный Взнос', 'tournament.prize_pool': 'Призовой Фонд', 'tournament.leaderboard': 'Таблица Лидеров', 'tournament.live': 'Идёт', 'tournament.upcoming': 'Скоро', 'tournament.ended': 'Завершён',
    'chat.title': 'Поддержка Фортуна', 'chat.placeholder': 'Введите сообщение...', 'chat.online': 'Онлайн',
  },
  ar: {
    'nav.lobby': 'الردهة', 'nav.games': 'الألعاب', 'nav.more': 'المزيد', 'nav.login': 'تسجيل الدخول', 'nav.register': 'التسجيل', 'nav.profile': 'الملف الشخصي', 'nav.wallet': 'المحفظة', 'nav.support': 'الدعم', 'nav.tournaments': 'البطولات', 'nav.leaderboards': 'لوحة المتصدرين', 'nav.referrals': 'الإحالات',
    'common.play': 'العب', 'common.bet': 'راهن', 'common.win': 'فوز', 'common.balance': 'الرصيد', 'common.loading': 'جارِ التحميل...', 'common.error': 'خطأ', 'common.success': 'نجاح', 'common.cancel': 'إلغاء', 'common.confirm': 'تأكيد', 'common.save': 'حفظ', 'common.back': 'رجوع', 'common.next': 'التالي', 'common.close': 'إغلاق', 'common.search': 'بحث', 'common.submit': 'إرسال',
    'auth.login': 'تسجيل الدخول', 'auth.register': 'إنشاء حساب', 'auth.logout': 'تسجيل الخروج', 'auth.email': 'البريد الإلكتروني', 'auth.password': 'كلمة المرور', 'auth.username': 'اسم المستخدم', 'auth.forgot_password': 'نسيت كلمة المرور؟', 'auth.remember_me': 'تذكرني', 'auth.or_continue_with': 'أو تابع مع', 'auth.demo_mode': 'العب في الوضع التجريبي', 'auth.no_account': 'ليس لديك حساب؟', 'auth.have_account': 'لديك حساب بالفعل؟',
    'games.slots': 'السلوتس', 'games.blackjack': 'بلاك جاك', 'games.roulette': 'الروليت', 'games.poker': 'فيديو بوكر', 'games.crash': 'كراش', 'games.plinko': 'بلينكو', 'games.dice': 'النرد', 'games.coinflip': 'رمي العملة', 'games.mines': 'الألغام', 'games.keno': 'كينو', 'games.limbo': 'ليمبو', 'games.hilo': 'هاي-لو', 'games.lottery': 'اليانصيب', 'games.jackpot': 'الجائزة الكبرى', 'games.holdem': "هولدم",
    'games.place_bet': 'ضع رهان', 'games.cash_out': 'سحب', 'games.spin': 'دوّر', 'games.deal': 'وزّع', 'games.flip': 'اقلب', 'games.roll': 'ارمِ', 'games.you_won': '!لقد فزت', 'games.you_lost': 'لقد خسرت', 'games.bet_amount': 'مبلغ الرهان', 'games.auto_bet': 'رهان تلقائي', 'games.max_bet': 'الأقصى', 'games.min_bet': 'الأدنى',
    'wallet.deposit': 'إيداع', 'wallet.withdraw': 'سحب', 'wallet.history': 'سجل المعاملات', 'wallet.add_funds': 'إضافة أموال',
    'footer.terms': 'شروط الخدمة', 'footer.privacy': 'سياسة الخصوصية', 'footer.responsible_gambling': 'القمار المسؤول', 'footer.provably_fair': 'عادل بشكل مُثبت', 'footer.about': 'حول', 'footer.faq': 'الأسئلة الشائعة', 'footer.gambling_warning': 'القمار قد يسبب الإدمان. العب بمسؤولية.',
    'rg.title': 'القمار المسؤول', 'rg.session_timer': 'الجلسة الحالية', 'rg.loss_limit': 'حد الخسارة اليومي', 'rg.deposit_limit': 'حد الإيداع اليومي', 'rg.self_exclusion': 'الاستبعاد الذاتي', 'rg.session_time_limit': 'حد وقت الجلسة', 'rg.help_resources': 'المساعدة والموارد',
    'tournament.title': 'البطولات', 'tournament.join': 'انضم للبطولة', 'tournament.entry_fee': 'رسوم الدخول', 'tournament.prize_pool': 'مجمع الجوائز', 'tournament.leaderboard': 'لوحة المتصدرين', 'tournament.live': 'مباشر', 'tournament.upcoming': 'قادم', 'tournament.ended': 'انتهت',
    'chat.title': 'دعم فورتونا', 'chat.placeholder': 'اكتب رسالة...', 'chat.online': 'متصل',
  },
}
