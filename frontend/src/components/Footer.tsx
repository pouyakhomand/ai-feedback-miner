export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <span>© 2024 AI Feedback Miner</span>
          <span>•</span>
          <a href="#" className="hover:text-gray-700">
            Privacy Policy
          </a>
          <span>•</span>
          <a href="#" className="hover:text-gray-700">
            Terms of Service
          </a>
        </div>
        <div className="flex items-center space-x-4">
          <span>Status: All systems operational</span>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        </div>
      </div>
    </footer>
  );
}
