import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, UserPlus, AlertCircle, X } from "lucide-react";

function Toast({ message, onClose, type = "error" }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    container: {
      position: 'fixed',
      top: '24px',
      right: '24px',
      background: '#fff',
      border: `1px solid ${type === 'error' ? '#feb2b2' : '#9ae6b4'}`,
      borderRadius: '12px',
      padding: '16px 20px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '320px',
      maxWidth: '500px',
      zIndex: 1000,
      animation: 'slideIn 0.3s ease-out'
    },
    iconWrapper: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: type === 'error' ? '#fff5f5' : '#f0fff4',
      flexShrink: 0
    },
    content: {
      flex: 1,
      color: '#2d3748',
      fontSize: '14px',
      fontWeight: '500'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#a0aec0',
      transition: 'color 0.2s',
      flexShrink: 0
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <div style={styles.container}>
        <div style={styles.iconWrapper}>
          <AlertCircle 
            size={20} 
            color={type === 'error' ? '#e53e3e' : '#38a169'} 
          />
        </div>
        <div style={styles.content}>{message}</div>
        <button 
          style={styles.closeButton}
          onClick={onClose}
          onMouseEnter={(e) => e.target.style.color = '#2d3748'}
          onMouseLeave={(e) => e.target.style.color = '#a0aec0'}
        >
          <X size={18} />
        </button>
      </div>
    </>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setIsLoading(false);

    if (error) {
      setShake(true);
      setToast({
        message: error.message,
        type: "error"
      });
      setTimeout(() => setShake(false), 500);
    } else {
      navigate("/home/");
    }
  }

  function handleRegisterClick() {
    navigate("/register");
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter') {
      handleLogin(e);
    }
  }

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    card: {
      width: '100%',
      maxWidth: '420px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '24px',
      padding: '40px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      animation: shake ? 'shake 0.5s' : 'none'
    },
    iconBox: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '64px',
      height: '64px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      marginBottom: '20px',
      boxShadow: '0 8px 16px rgba(102, 126, 234, 0.4)'
    },
    heading: {
      fontSize: '32px',
      fontWeight: '700',
      color: '#1a202c',
      marginBottom: '8px',
      marginTop: 0
    },
    subtitle: {
      color: '#718096',
      marginBottom: '32px',
      marginTop: 0
    },
    inputWrapper: {
      position: 'relative',
      marginBottom: '20px'
    },
    inputIcon: {
      position: 'absolute',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#a0aec0'
    },
    input: {
      width: '100%',
      padding: '14px 16px 14px 48px',
      background: '#f7fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '16px',
      color: '#1a202c',
      outline: 'none',
      transition: 'all 0.2s',
      boxSizing: 'border-box'
    },
    inputFocus: {
      border: '2px solid #764ba2',
      background: '#fff'
    },
    button: {
      width: '100%',
      padding: '14px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
      transition: 'all 0.2s',
      marginTop: '8px'
    },
    buttonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    divider: {
      marginTop: '24px',
      paddingTop: '24px',
      borderTop: '1px solid #e2e8f0'
    },
    secondaryButton: {
      width: '100%',
      padding: '14px',
      background: '#f7fafc',
      color: '#2d3748',
      border: 'none',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'all 0.2s'
    },
    spinner: {
      width: '20px',
      height: '20px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderTop: '2px solid white',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        button:hover:not(:disabled) {
          transform: scale(1.02);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
        button:active:not(:disabled) {
          transform: scale(0.98);
        }
      `}</style>
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type}
          onClose={() => setToast(null)} 
        />
      )}

      <div style={styles.card}>
        <div style={{ textAlign: 'center' }}>
          <div style={styles.iconBox}>
            <Lock size={32} color="white" />
          </div>
          <h1 style={styles.heading}>Welcome Back</h1>
          <p style={styles.subtitle}>Sign in to your account to continue</p>
        </div>

        <div>
          <div style={styles.inputWrapper}>
            <div style={styles.inputIcon}>
              <Mail size={20} />
            </div>
            <input 
              type="email" 
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              style={{
                ...styles.input,
                ...(emailFocused ? styles.inputFocus : {})
              }}
            />
          </div>

          <div style={styles.inputWrapper}>
            <div style={styles.inputIcon}>
              <Lock size={20} />
            </div>
            <input 
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              style={{
                ...styles.input,
                ...(passwordFocused ? styles.inputFocus : {})
              }}
            />
          </div>

          <button 
            onClick={handleLogin}
            disabled={isLoading}
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {})
            }}
          >
            {isLoading ? (
              <div style={styles.spinner}></div>
            ) : (
              <>
                Sign In
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>

        <div style={styles.divider}>
          <button 
            onClick={handleRegisterClick}
            style={styles.secondaryButton}
          >
            <UserPlus size={20} />
            Create New Account
          </button>
        </div>
      </div>
    </div>
  );
}