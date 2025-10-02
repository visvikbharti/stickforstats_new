"""
Seed Management System for Perfect Reproducibility
==================================================
Created: 2025-01-10
Author: StickForStats Development Team

Manage random seeds across all modules and libraries to ensure
perfect reproducibility of stochastic processes. This includes
numpy, scipy, sklearn, and any custom randomization.
"""

import random
import numpy as np
import hashlib
import json
from typing import Dict, Optional, Any, List, Callable
from contextlib import contextmanager
from dataclasses import dataclass
import logging
import warnings

logger = logging.getLogger(__name__)


@dataclass
class SeedState:
    """Snapshot of random state at a point in time"""
    module: str
    seed: int
    state: Any  # Module-specific state object
    timestamp: str


class SeedManager:
    """
    Centralized management of random seeds for reproducibility
    
    This class ensures that all random number generation is deterministic
    by managing seeds across different libraries and modules.
    """
    
    def __init__(self, master_seed: Optional[int] = None):
        """
        Initialize seed manager
        
        Args:
            master_seed: Master seed for all randomization. If None, generates one.
        """
        if master_seed is None:
            # Generate a random master seed
            master_seed = self._generate_random_seed()
            logger.info(f"Generated random master seed: {master_seed}")
        else:
            logger.info(f"Using provided master seed: {master_seed}")
        
        self.master_seed = master_seed
        self.module_seeds: Dict[str, int] = {}
        self.seed_history: List[Dict[str, Any]] = []
        self.state_snapshots: Dict[str, Any] = {}
        self.is_locked = False
        
        # Generate module-specific seeds
        self._generate_module_seeds()
        
        # Apply seeds immediately
        self.set_all_seeds()
    
    def _generate_random_seed(self) -> int:
        """Generate a random seed using system entropy"""
        import secrets
        return secrets.randbits(32)
    
    def _generate_module_seeds(self) -> None:
        """Generate deterministic seeds for each module from master seed"""
        # Use master seed to generate module seeds deterministically
        rng = np.random.RandomState(self.master_seed)
        
        # Define modules that need seeds
        modules = [
            'numpy',
            'random',  # Python's random module
            'scipy',
            'pandas',
            'sklearn',
            'torch',  # PyTorch if available
            'tensorflow',  # TensorFlow if available
            # StickForStats modules
            'test_recommender',
            'power_analysis',
            'effect_sizes',
            'robust_estimators',
            'bootstrap',
            'permutation',
            'monte_carlo',
            'cross_validation'
        ]
        
        # Generate a unique seed for each module
        for module in modules:
            # Use hash for more entropy
            module_hash = hashlib.md5(f"{self.master_seed}_{module}".encode()).hexdigest()
            module_seed = int(module_hash[:8], 16) % (2**32)
            self.module_seeds[module] = module_seed
        
        logger.debug(f"Generated seeds for {len(self.module_seeds)} modules")
    
    def set_all_seeds(self) -> None:
        """Set all random seeds across all libraries"""
        if self.is_locked:
            logger.warning("Seed manager is locked. Unlock before setting seeds.")
            return
        
        # Python's random module
        random.seed(self.module_seeds['random'])
        
        # NumPy
        np.random.seed(self.module_seeds['numpy'])
        
        # Try to set seeds for optional libraries
        self._set_optional_library_seeds()
        
        # Record in history
        self.seed_history.append({
            'action': 'set_all_seeds',
            'master_seed': self.master_seed,
            'timestamp': self._get_timestamp()
        })
        
        logger.info("All random seeds set successfully")
    
    def _set_optional_library_seeds(self) -> None:
        """Set seeds for optional libraries if they're installed"""
        
        # SciPy (uses NumPy's random state)
        # No separate seed needed
        
        # scikit-learn
        try:
            import sklearn
            # sklearn uses numpy's random state for most operations
            # Some estimators have random_state parameter
            logger.debug("sklearn detected, will use numpy seed")
        except ImportError:
            pass
        
        # PyTorch
        try:
            import torch
            torch.manual_seed(self.module_seeds.get('torch', self.master_seed))
            if torch.cuda.is_available():
                torch.cuda.manual_seed_all(self.module_seeds.get('torch', self.master_seed))
            logger.debug("PyTorch seeds set")
        except ImportError:
            pass
        
        # TensorFlow
        try:
            import tensorflow as tf
            tf.random.set_seed(self.module_seeds.get('tensorflow', self.master_seed))
            logger.debug("TensorFlow seed set")
        except ImportError:
            pass
    
    def get_module_seed(self, module: str) -> int:
        """
        Get seed for a specific module
        
        Args:
            module: Module name
            
        Returns:
            Seed value for the module
        """
        if module not in self.module_seeds:
            # Generate on-demand for new modules
            module_hash = hashlib.md5(f"{self.master_seed}_{module}".encode()).hexdigest()
            self.module_seeds[module] = int(module_hash[:8], 16) % (2**32)
        
        return self.module_seeds[module]
    
    @contextmanager
    def temporary_seed(self, seed: Optional[int] = None, module: str = 'numpy'):
        """
        Context manager for temporarily using a different seed
        
        Usage:
            with seed_manager.temporary_seed(42):
                # Code that uses seed 42
                pass
            # Original seed restored
        
        Args:
            seed: Temporary seed to use (None for random)
            module: Module to affect ('numpy', 'random', 'all')
        """
        if seed is None:
            seed = self._generate_random_seed()
        
        # Save current state
        if module == 'numpy' or module == 'all':
            numpy_state = np.random.get_state()
        if module == 'random' or module == 'all':
            random_state = random.getstate()
        
        try:
            # Set temporary seed
            if module == 'numpy' or module == 'all':
                np.random.seed(seed)
            if module == 'random' or module == 'all':
                random.seed(seed)
            
            logger.debug(f"Temporarily set seed {seed} for {module}")
            yield seed
            
        finally:
            # Restore original state
            if module == 'numpy' or module == 'all':
                np.random.set_state(numpy_state)
            if module == 'random' or module == 'all':
                random.setstate(random_state)
            
            logger.debug(f"Restored original seed state for {module}")
    
    def save_state(self, name: str) -> None:
        """
        Save current random state snapshot
        
        Args:
            name: Name for the snapshot
        """
        snapshot = {
            'numpy': np.random.get_state(),
            'random': random.getstate(),
            'master_seed': self.master_seed,
            'module_seeds': self.module_seeds.copy(),
            'timestamp': self._get_timestamp()
        }
        
        self.state_snapshots[name] = snapshot
        logger.info(f"Saved random state snapshot '{name}'")
    
    def restore_state(self, name: str) -> None:
        """
        Restore a previously saved random state
        
        Args:
            name: Name of the snapshot to restore
        """
        if self.is_locked:
            logger.warning("Seed manager is locked. Unlock before restoring state.")
            return
        
        if name not in self.state_snapshots:
            raise ValueError(f"No snapshot found with name '{name}'")
        
        snapshot = self.state_snapshots[name]
        
        # Restore states
        np.random.set_state(snapshot['numpy'])
        random.setstate(snapshot['random'])
        self.master_seed = snapshot['master_seed']
        self.module_seeds = snapshot['module_seeds'].copy()
        
        logger.info(f"Restored random state from snapshot '{name}'")
    
    def lock(self) -> None:
        """Lock the seed manager to prevent accidental changes"""
        self.is_locked = True
        logger.info("Seed manager locked")
    
    def unlock(self) -> None:
        """Unlock the seed manager to allow changes"""
        self.is_locked = False
        logger.info("Seed manager unlocked")
    
    def get_random_generator(self, module: str) -> np.random.RandomState:
        """
        Get a seeded random generator for a specific module
        
        This creates an independent random generator that won't affect
        the global random state.
        
        Args:
            module: Module name
            
        Returns:
            Seeded RandomState object
        """
        seed = self.get_module_seed(module)
        return np.random.RandomState(seed)
    
    def verify_reproducibility(self, 
                              func: Callable,
                              n_runs: int = 3,
                              *args, **kwargs) -> bool:
        """
        Verify that a function produces reproducible results
        
        Args:
            func: Function to test
            n_runs: Number of times to run the function
            *args, **kwargs: Arguments to pass to the function
            
        Returns:
            True if all runs produce identical results
        """
        results = []
        
        for i in range(n_runs):
            # Reset seeds
            self.set_all_seeds()
            
            # Run function
            result = func(*args, **kwargs)
            results.append(result)
        
        # Check if all results are identical
        if len(results) < 2:
            return True
        
        # Compare results
        first_result = results[0]
        for result in results[1:]:
            if not self._compare_results(first_result, result):
                logger.warning(f"Reproducibility check failed for {func.__name__}")
                return False
        
        logger.info(f"Reproducibility verified for {func.__name__}")
        return True
    
    def _compare_results(self, result1: Any, result2: Any) -> bool:
        """Compare two results for equality"""
        try:
            if isinstance(result1, np.ndarray) and isinstance(result2, np.ndarray):
                return np.allclose(result1, result2, equal_nan=True)
            elif hasattr(result1, '__dict__') and hasattr(result2, '__dict__'):
                return result1.__dict__ == result2.__dict__
            else:
                return result1 == result2
        except:
            return False
    
    def export_config(self) -> Dict[str, Any]:
        """Export seed configuration for persistence"""
        return {
            'master_seed': self.master_seed,
            'module_seeds': self.module_seeds,
            'is_locked': self.is_locked,
            'seed_history': self.seed_history,
            'timestamp': self._get_timestamp()
        }
    
    def import_config(self, config: Dict[str, Any]) -> None:
        """Import seed configuration"""
        if self.is_locked:
            logger.warning("Seed manager is locked. Unlock before importing config.")
            return
        
        self.master_seed = config['master_seed']
        self.module_seeds = config['module_seeds']
        self.is_locked = config.get('is_locked', False)
        self.seed_history = config.get('seed_history', [])
        
        # Apply the imported seeds
        self.set_all_seeds()
        
        logger.info(f"Imported seed configuration with master seed {self.master_seed}")
    
    def _get_timestamp(self) -> str:
        """Get current timestamp as ISO string"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    def get_info(self) -> Dict[str, Any]:
        """Get information about current seed configuration"""
        return {
            'master_seed': self.master_seed,
            'n_module_seeds': len(self.module_seeds),
            'modules': list(self.module_seeds.keys()),
            'is_locked': self.is_locked,
            'n_snapshots': len(self.state_snapshots),
            'n_history_entries': len(self.seed_history)
        }
    
    def __repr__(self) -> str:
        """String representation"""
        status = "locked" if self.is_locked else "unlocked"
        return f"SeedManager(master={self.master_seed}, modules={len(self.module_seeds)}, {status})"


# Global seed manager instance
_global_seed_manager: Optional[SeedManager] = None


def get_seed_manager(master_seed: Optional[int] = None) -> SeedManager:
    """
    Get or create the global seed manager
    
    Args:
        master_seed: Master seed (only used if creating new manager)
        
    Returns:
        Global SeedManager instance
    """
    global _global_seed_manager
    
    if _global_seed_manager is None:
        _global_seed_manager = SeedManager(master_seed)
    
    return _global_seed_manager


def set_global_seed(seed: int) -> None:
    """Set the global master seed"""
    global _global_seed_manager
    _global_seed_manager = SeedManager(seed)


def with_seed(seed: Optional[int] = None):
    """
    Decorator to run a function with a specific seed
    
    Usage:
        @with_seed(42)
        def my_random_function():
            return np.random.randn(10)
    """
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            manager = get_seed_manager()
            with manager.temporary_seed(seed):
                return func(*args, **kwargs)
        return wrapper
    return decorator