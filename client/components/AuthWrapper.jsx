import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, CreditCard, Lock, Mail, User } from 'react-feather';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Payment form component
function PaymentForm({ user, onPaymentSuccess }) {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentError, setPaymentError] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);
        setPaymentError(null);

        try {
            // Create payment intent
            const response = await fetch('/api/payment/create-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const { clientSecret } = await response.json();

            // Confirm payment
            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement),
                    billing_details: {
                        name: user.name,
                        email: user.email
                    }
                }
            });

            if (result.error) {
                setPaymentError(result.error.message);
            } else {
                onPaymentSuccess();
            }
        } catch (error) {
            setPaymentError('Payment failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
                <CreditCard className="mx-auto mb-4 text-blue-600" size={48} />
                <h2 className="text-2xl font-bold text-gray-900">Medical Exam Access</h2>
                <p className="text-gray-600 mt-2">One-time payment for full access</p>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">$50</div>
                    <div className="text-sm text-gray-600">Lifetime access to all features</div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-4 border border-gray-300 rounded-lg">
                    <CardElement
                        options={{
                            style: {
                                base: {
                                    fontSize: '16px',
                                    color: '#424770',
                                    '::placeholder': {
                                        color: '#aab7c4',
                                    },
                                },
                            },
                        }}
                    />
                </div>

                {paymentError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                        <AlertCircle size={20} />
                        <span>{paymentError}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!stripe || isProcessing}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? 'Processing...' : 'Pay $50 & Get Access'}
                </button>

                <div className="text-xs text-gray-500 text-center">
                    Secure payment powered by Stripe. Your payment information is encrypted and secure.
                </div>
            </form>
        </div>
    );
}

// Main auth wrapper component
export default function AuthWrapper({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hasSubscription, setHasSubscription] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: ''
    });
    const [authError, setAuthError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    // Check authentication status on mount
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                setIsAuthenticated(true);
                setHasSubscription(data.subscription.hasActive);
            } else {
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setAuthError(null);

        try {
            const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                setUser(data.user);
                setIsAuthenticated(true);
                setHasSubscription(false); // New users need to pay
            } else {
                setAuthError(data.error);
            }
        } catch (error) {
            setAuthError('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePaymentSuccess = () => {
        setPaymentSuccess(true);
        setTimeout(() => {
            setHasSubscription(true);
        }, 2000);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setHasSubscription(false);
        setUser(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Show payment success message
    if (paymentSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
                    <CheckCircle className="mx-auto mb-4 text-green-600" size={64} />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
                    <p className="text-gray-600 mb-4">
                        Your payment has been processed successfully. You now have full access to the Medical Exam System.
                    </p>
                    <div className="animate-pulse text-blue-600">
                        Activating your account...
                    </div>
                </div>
            </div>
        );
    }

    // Show payment form if authenticated but no subscription
    if (isAuthenticated && !hasSubscription) {
        return (
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Welcome, {user.name}!
                        </h1>
                        <p className="text-gray-600">
                            Complete your purchase to access the Medical Exam System
                        </p>
                        <button
                            onClick={handleLogout}
                            className="mt-4 text-sm text-gray-500 hover:text-gray-700"
                        >
                            Logout
                        </button>
                    </div>

                    <Elements stripe={stripePromise}>
                        <PaymentForm user={user} onPaymentSuccess={handlePaymentSuccess} />
                    </Elements>

                    <div className="mt-8 max-w-2xl mx-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">What you get:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="text-green-600 mt-1" size={20} />
                                <div>
                                    <div className="font-medium">AI-Powered Examiner</div>
                                    <div className="text-sm text-gray-600">Advanced medical case assessment</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle className="text-green-600 mt-1" size={20} />
                                <div>
                                    <div className="font-medium">45+ Case Protocols</div>
                                    <div className="text-sm text-gray-600">Comprehensive medical scenarios</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle className="text-green-600 mt-1" size={20} />
                                <div>
                                    <div className="font-medium">Real-time Grading</div>
                                    <div className="text-sm text-gray-600">Instant feedback on performance</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle className="text-green-600 mt-1" size={20} />
                                <div>
                                    <div className="font-medium">Performance Reports</div>
                                    <div className="text-sm text-gray-600">Detailed analysis and recommendations</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Show main app if authenticated and has subscription
    if (isAuthenticated && hasSubscription) {
        return children;
    }

    // Show login/register form
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Medical Exam System</h1>
                    <p className="mt-2 text-gray-600">
                        AI-powered medical examination preparation
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="flex justify-center mb-6">
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${authMode === 'login'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                onClick={() => setAuthMode('login')}
                            >
                                Login
                            </button>
                            <button
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${authMode === 'register'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                onClick={() => setAuthMode('register')}
                            >
                                Register
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {authMode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        required
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter your full name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="password"
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        {authError && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                                <AlertCircle size={20} />
                                <span>{authError}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Please wait...' : (authMode === 'login' ? 'Login' : 'Register')}
                        </button>
                    </form>

                    {authMode === 'register' && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <div className="text-sm text-blue-800">
                                <strong>After registration:</strong> You'll need to purchase access for $50 to use the medical exam system.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 