"""
State Capture System for Module State Persistence
=================================================
Created: 2025-01-10
Author: StickForStats Development Team

Capture complete state of all analysis modules to enable exact
reproducibility. This includes capturing test recommendations,
hypothesis registrations, power calculations, effect sizes, and
all analytical decisions made during the session.
"""

import json
import pickle
import copy
from typing import Dict, Any, Optional, List, Union, Type
from datetime import datetime
import logging
import inspect
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class StateCapture:
    """
    Capture and restore complete state of analysis modules
    
    This class provides mechanisms to capture the internal state
    of all StickForStats analysis modules, allowing for perfect
    state restoration when reproducing analyses.
    """
    
    def __init__(self):
        """Initialize state capture system"""
        self.captured_states: Dict[str, Any] = {}
        self.state_history: List[Dict[str, Any]] = []
        self.capture_timestamp: Optional[datetime] = None
        logger.info("StateCapture system initialized")
    
    def capture_test_recommender(self, recommender) -> Dict[str, Any]:
        """
        Capture state of TestRecommender module
        
        Args:
            recommender: TestRecommender instance
            
        Returns:
            Captured state dictionary
        """
        state = {
            'module': 'TestRecommender',
            'timestamp': datetime.now().isoformat(),
            'recommendations': [],
            'data_characteristics': {},
            'assumption_checks': [],
            'decision_tree': {}
        }
        
        # Capture recommendations history
        if hasattr(recommender, 'recommendation_history'):
            state['recommendations'] = self._serialize_recommendations(
                recommender.recommendation_history
            )
        
        # Capture data characteristics
        if hasattr(recommender, 'data_characteristics'):
            state['data_characteristics'] = self._make_serializable(
                recommender.data_characteristics
            )
        
        # Capture assumption check results
        if hasattr(recommender, 'assumption_results'):
            state['assumption_checks'] = self._serialize_assumption_checks(
                recommender.assumption_results
            )
        
        # Capture decision tree state
        if hasattr(recommender, 'decision_tree'):
            state['decision_tree'] = self._serialize_decision_tree(
                recommender.decision_tree
            )
        
        self.captured_states['test_recommender'] = state
        logger.info("Captured TestRecommender state")
        return state
    
    def capture_hypothesis_registry(self, registry) -> Dict[str, Any]:
        """
        Capture state of HypothesisRegistry
        
        Args:
            registry: HypothesisRegistry instance
            
        Returns:
            Captured state dictionary
        """
        state = {
            'module': 'HypothesisRegistry',
            'timestamp': datetime.now().isoformat(),
            'registered_hypotheses': [],
            'test_results': [],
            'correction_methods': [],
            'alpha_levels': {}
        }
        
        # Capture registered hypotheses
        if hasattr(registry, 'hypotheses'):
            state['registered_hypotheses'] = [
                self._serialize_hypothesis(h) for h in registry.hypotheses
            ]
        
        # Capture test results
        if hasattr(registry, 'test_results'):
            state['test_results'] = [
                self._serialize_test_result(r) for r in registry.test_results
            ]
        
        # Capture correction methods applied
        if hasattr(registry, 'corrections_applied'):
            state['correction_methods'] = registry.corrections_applied
        
        # Capture alpha levels
        if hasattr(registry, 'alpha_global'):
            state['alpha_levels'] = {
                'global': registry.alpha_global,
                'adjusted': getattr(registry, 'alpha_adjusted', None)
            }
        
        self.captured_states['hypothesis_registry'] = state
        logger.info("Captured HypothesisRegistry state")
        return state
    
    def capture_power_analysis(self, power_analyzer) -> Dict[str, Any]:
        """
        Capture state of PowerAnalysis module
        
        Args:
            power_analyzer: PowerAnalysis instance
            
        Returns:
            Captured state dictionary
        """
        state = {
            'module': 'PowerAnalysis',
            'timestamp': datetime.now().isoformat(),
            'calculations': [],
            'sample_size_determinations': [],
            'power_curves': [],
            'effect_size_calculations': []
        }
        
        # Capture power calculations
        if hasattr(power_analyzer, 'calculation_history'):
            state['calculations'] = [
                self._serialize_power_calculation(calc)
                for calc in power_analyzer.calculation_history
            ]
        
        # Capture sample size determinations
        if hasattr(power_analyzer, 'sample_size_history'):
            state['sample_size_determinations'] = [
                self._serialize_sample_size(ss)
                for ss in power_analyzer.sample_size_history
            ]
        
        # Capture power curves
        if hasattr(power_analyzer, 'power_curves'):
            state['power_curves'] = self._serialize_power_curves(
                power_analyzer.power_curves
            )
        
        self.captured_states['power_analysis'] = state
        logger.info("Captured PowerAnalysis state")
        return state
    
    def capture_effect_sizes(self, effect_calculator) -> Dict[str, Any]:
        """
        Capture state of EffectSizeCalculator
        
        Args:
            effect_calculator: EffectSizeCalculator instance
            
        Returns:
            Captured state dictionary
        """
        state = {
            'module': 'EffectSizeCalculator',
            'timestamp': datetime.now().isoformat(),
            'calculated_effects': [],
            'confidence_intervals': [],
            'interpretations': []
        }
        
        # Capture calculated effect sizes
        if hasattr(effect_calculator, 'effect_history'):
            state['calculated_effects'] = [
                self._serialize_effect_size(effect)
                for effect in effect_calculator.effect_history
            ]
        
        # Capture confidence intervals
        if hasattr(effect_calculator, 'ci_history'):
            state['confidence_intervals'] = self._serialize_confidence_intervals(
                effect_calculator.ci_history
            )
        
        # Capture interpretations
        if hasattr(effect_calculator, 'interpretations'):
            state['interpretations'] = effect_calculator.interpretations
        
        self.captured_states['effect_sizes'] = state
        logger.info("Captured EffectSizeCalculator state")
        return state
    
    def capture_robust_estimators(self, robust_estimator) -> Dict[str, Any]:
        """
        Capture state of RobustEstimator module
        
        Args:
            robust_estimator: RobustEstimator instance
            
        Returns:
            Captured state dictionary
        """
        state = {
            'module': 'RobustEstimator',
            'timestamp': datetime.now().isoformat(),
            'estimations': [],
            'outlier_detections': [],
            'bootstrap_results': [],
            'influence_measures': []
        }
        
        # Capture robust estimations
        if hasattr(robust_estimator, 'estimation_history'):
            state['estimations'] = [
                self._serialize_robust_estimation(est)
                for est in robust_estimator.estimation_history
            ]
        
        # Capture outlier detections
        if hasattr(robust_estimator, 'outlier_history'):
            state['outlier_detections'] = self._serialize_outlier_detections(
                robust_estimator.outlier_history
            )
        
        # Capture bootstrap results
        if hasattr(robust_estimator, 'bootstrap_history'):
            state['bootstrap_results'] = [
                self._serialize_bootstrap_result(boot)
                for boot in robust_estimator.bootstrap_history
            ]
        
        self.captured_states['robust_estimators'] = state
        logger.info("Captured RobustEstimator state")
        return state
    
    def capture_all_modules(self, modules: Dict[str, Any]) -> Dict[str, Any]:
        """
        Capture state of all provided modules
        
        Args:
            modules: Dictionary mapping module names to instances
            
        Returns:
            Complete state dictionary
        """
        complete_state = {
            'capture_timestamp': datetime.now().isoformat(),
            'module_states': {}
        }
        
        # Map module names to capture methods
        capture_methods = {
            'test_recommender': self.capture_test_recommender,
            'hypothesis_registry': self.capture_hypothesis_registry,
            'power_analysis': self.capture_power_analysis,
            'effect_sizes': self.capture_effect_sizes,
            'robust_estimators': self.capture_robust_estimators
        }
        
        for module_name, module_instance in modules.items():
            if module_name in capture_methods and module_instance is not None:
                try:
                    state = capture_methods[module_name](module_instance)
                    complete_state['module_states'][module_name] = state
                    logger.info(f"Captured state for {module_name}")
                except Exception as e:
                    logger.error(f"Failed to capture {module_name}: {e}")
                    complete_state['module_states'][module_name] = {
                        'error': str(e),
                        'module': module_name,
                        'timestamp': datetime.now().isoformat()
                    }
        
        # Store in history
        self.state_history.append(complete_state)
        self.capture_timestamp = datetime.now()
        
        logger.info(f"Captured state for {len(complete_state['module_states'])} modules")
        return complete_state
    
    def restore_module_state(self, module_name: str, module_instance: Any, 
                            state: Dict[str, Any]) -> bool:
        """
        Restore a module to a captured state
        
        Args:
            module_name: Name of the module
            module_instance: Module instance to restore
            state: Captured state to restore
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if module_name == 'test_recommender':
                return self._restore_test_recommender(module_instance, state)
            elif module_name == 'hypothesis_registry':
                return self._restore_hypothesis_registry(module_instance, state)
            elif module_name == 'power_analysis':
                return self._restore_power_analysis(module_instance, state)
            elif module_name == 'effect_sizes':
                return self._restore_effect_sizes(module_instance, state)
            elif module_name == 'robust_estimators':
                return self._restore_robust_estimators(module_instance, state)
            else:
                logger.warning(f"Unknown module type: {module_name}")
                return False
        except Exception as e:
            logger.error(f"Failed to restore {module_name}: {e}")
            return False
    
    def _restore_test_recommender(self, recommender, state: Dict[str, Any]) -> bool:
        """Restore TestRecommender state"""
        try:
            if 'recommendations' in state:
                recommender.recommendation_history = state['recommendations']
            if 'data_characteristics' in state:
                recommender.data_characteristics = state['data_characteristics']
            if 'assumption_checks' in state:
                recommender.assumption_results = state['assumption_checks']
            if 'decision_tree' in state:
                recommender.decision_tree = state['decision_tree']
            
            logger.info("Restored TestRecommender state")
            return True
        except Exception as e:
            logger.error(f"Failed to restore TestRecommender: {e}")
            return False
    
    def _restore_hypothesis_registry(self, registry, state: Dict[str, Any]) -> bool:
        """Restore HypothesisRegistry state"""
        try:
            if 'registered_hypotheses' in state:
                registry.hypotheses = state['registered_hypotheses']
            if 'test_results' in state:
                registry.test_results = state['test_results']
            if 'correction_methods' in state:
                registry.corrections_applied = state['correction_methods']
            if 'alpha_levels' in state:
                registry.alpha_global = state['alpha_levels'].get('global', 0.05)
                registry.alpha_adjusted = state['alpha_levels'].get('adjusted')
            
            logger.info("Restored HypothesisRegistry state")
            return True
        except Exception as e:
            logger.error(f"Failed to restore HypothesisRegistry: {e}")
            return False
    
    def _restore_power_analysis(self, power_analyzer, state: Dict[str, Any]) -> bool:
        """Restore PowerAnalysis state"""
        try:
            if 'calculations' in state:
                power_analyzer.calculation_history = state['calculations']
            if 'sample_size_determinations' in state:
                power_analyzer.sample_size_history = state['sample_size_determinations']
            if 'power_curves' in state:
                power_analyzer.power_curves = state['power_curves']
            
            logger.info("Restored PowerAnalysis state")
            return True
        except Exception as e:
            logger.error(f"Failed to restore PowerAnalysis: {e}")
            return False
    
    def _restore_effect_sizes(self, effect_calculator, state: Dict[str, Any]) -> bool:
        """Restore EffectSizeCalculator state"""
        try:
            if 'calculated_effects' in state:
                effect_calculator.effect_history = state['calculated_effects']
            if 'confidence_intervals' in state:
                effect_calculator.ci_history = state['confidence_intervals']
            if 'interpretations' in state:
                effect_calculator.interpretations = state['interpretations']
            
            logger.info("Restored EffectSizeCalculator state")
            return True
        except Exception as e:
            logger.error(f"Failed to restore EffectSizeCalculator: {e}")
            return False
    
    def _restore_robust_estimators(self, robust_estimator, state: Dict[str, Any]) -> bool:
        """Restore RobustEstimator state"""
        try:
            if 'estimations' in state:
                robust_estimator.estimation_history = state['estimations']
            if 'outlier_detections' in state:
                robust_estimator.outlier_history = state['outlier_detections']
            if 'bootstrap_results' in state:
                robust_estimator.bootstrap_history = state['bootstrap_results']
            
            logger.info("Restored RobustEstimator state")
            return True
        except Exception as e:
            logger.error(f"Failed to restore RobustEstimator: {e}")
            return False
    
    # Serialization helper methods
    def _make_serializable(self, obj: Any, max_depth: int = 5, depth: int = 0) -> Any:
        """Convert object to JSON-serializable format"""
        if depth > max_depth:
            return f"<{type(obj).__name__}>"
        
        if obj is None or isinstance(obj, (bool, int, float, str)):
            return obj
        
        elif isinstance(obj, (list, tuple)):
            return [self._make_serializable(item, max_depth, depth + 1) for item in obj]
        
        elif isinstance(obj, dict):
            return {
                key: self._make_serializable(value, max_depth, depth + 1)
                for key, value in obj.items()
            }
        
        elif isinstance(obj, np.ndarray):
            return {
                'type': 'numpy.ndarray',
                'shape': obj.shape,
                'dtype': str(obj.dtype),
                'data': obj.tolist() if obj.size < 1000 else f"<array of {obj.size} elements>"
            }
        
        elif isinstance(obj, pd.DataFrame):
            return {
                'type': 'pandas.DataFrame',
                'shape': obj.shape,
                'columns': list(obj.columns),
                'index_name': obj.index.name,
                'data': obj.to_dict('records') if len(obj) < 100 else f"<{len(obj)} rows>"
            }
        
        elif isinstance(obj, pd.Series):
            return {
                'type': 'pandas.Series',
                'shape': obj.shape,
                'name': obj.name,
                'dtype': str(obj.dtype),
                'data': obj.tolist() if len(obj) < 100 else f"<{len(obj)} elements>"
            }
        
        elif hasattr(obj, '__dict__'):
            return {
                'type': type(obj).__name__,
                'attributes': self._make_serializable(obj.__dict__, max_depth, depth + 1)
            }
        
        else:
            return f"<{type(obj).__name__}>"
    
    def _serialize_recommendations(self, recommendations: List) -> List[Dict]:
        """Serialize test recommendations"""
        serialized = []
        for rec in recommendations:
            serialized.append(self._make_serializable(rec))
        return serialized
    
    def _serialize_assumption_checks(self, checks: List) -> List[Dict]:
        """Serialize assumption check results"""
        serialized = []
        for check in checks:
            serialized.append(self._make_serializable(check))
        return serialized
    
    def _serialize_decision_tree(self, tree: Any) -> Dict:
        """Serialize decision tree structure"""
        return self._make_serializable(tree)
    
    def _serialize_hypothesis(self, hypothesis: Any) -> Dict:
        """Serialize a hypothesis"""
        return self._make_serializable(hypothesis)
    
    def _serialize_test_result(self, result: Any) -> Dict:
        """Serialize a test result"""
        return self._make_serializable(result)
    
    def _serialize_power_calculation(self, calc: Any) -> Dict:
        """Serialize a power calculation"""
        return self._make_serializable(calc)
    
    def _serialize_sample_size(self, ss: Any) -> Dict:
        """Serialize sample size determination"""
        return self._make_serializable(ss)
    
    def _serialize_power_curves(self, curves: Any) -> List[Dict]:
        """Serialize power curves"""
        return self._make_serializable(curves)
    
    def _serialize_effect_size(self, effect: Any) -> Dict:
        """Serialize effect size calculation"""
        return self._make_serializable(effect)
    
    def _serialize_confidence_intervals(self, cis: Any) -> List[Dict]:
        """Serialize confidence intervals"""
        return self._make_serializable(cis)
    
    def _serialize_robust_estimation(self, est: Any) -> Dict:
        """Serialize robust estimation"""
        return self._make_serializable(est)
    
    def _serialize_outlier_detections(self, outliers: Any) -> List[Dict]:
        """Serialize outlier detections"""
        return self._make_serializable(outliers)
    
    def _serialize_bootstrap_result(self, boot: Any) -> Dict:
        """Serialize bootstrap result"""
        return self._make_serializable(boot)
    
    def export_state(self) -> Dict[str, Any]:
        """Export captured state for persistence"""
        return {
            'captured_states': self.captured_states,
            'state_history': self.state_history,
            'capture_timestamp': self.capture_timestamp.isoformat() if self.capture_timestamp else None
        }
    
    def import_state(self, state_data: Dict[str, Any]) -> None:
        """Import previously captured state"""
        self.captured_states = state_data.get('captured_states', {})
        self.state_history = state_data.get('state_history', [])
        
        timestamp_str = state_data.get('capture_timestamp')
        if timestamp_str:
            self.capture_timestamp = datetime.fromisoformat(timestamp_str)
        
        logger.info(f"Imported state with {len(self.captured_states)} module states")
    
    def get_state_summary(self) -> Dict[str, Any]:
        """Get summary of captured states"""
        summary = {
            'n_modules_captured': len(self.captured_states),
            'modules': list(self.captured_states.keys()),
            'capture_timestamp': self.capture_timestamp.isoformat() if self.capture_timestamp else None,
            'history_length': len(self.state_history)
        }
        
        # Add module-specific summaries
        for module_name, state in self.captured_states.items():
            if module_name == 'test_recommender':
                summary[f'{module_name}_n_recommendations'] = len(state.get('recommendations', []))
            elif module_name == 'hypothesis_registry':
                summary[f'{module_name}_n_hypotheses'] = len(state.get('registered_hypotheses', []))
            elif module_name == 'power_analysis':
                summary[f'{module_name}_n_calculations'] = len(state.get('calculations', []))
            elif module_name == 'effect_sizes':
                summary[f'{module_name}_n_effects'] = len(state.get('calculated_effects', []))
            elif module_name == 'robust_estimators':
                summary[f'{module_name}_n_estimations'] = len(state.get('estimations', []))
        
        return summary
    
    def clear(self) -> None:
        """Clear all captured states"""
        self.captured_states.clear()
        self.state_history.clear()
        self.capture_timestamp = None
        logger.info("Cleared all captured states")