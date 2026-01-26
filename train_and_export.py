import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import pickle
import json

def clean_numeric_column(series):
    """Convert column to numeric, handling percentages and other formats"""
    if pd.api.types.is_numeric_dtype(series):
        return series
    
    series = series.astype(str).str.strip()
    series = series.str.replace('%', '', regex=False)
    series = series.replace({'Yes': '1', 'No': '0', 'yes': '1', 'no': '0'})
    series = pd.to_numeric(series, errors='coerce')
    
    return series

def load_and_prepare_data(csv_path='cod_stats.csv'):
    """Load and filter data for Hardpoint games"""
    df = pd.read_csv(csv_path, encoding='utf-8-sig', low_memory=False)
    df = df[df['Game Type'] == 'Hardpoint']
    
    # Filter for ranked play pool maps only
    ranked_maps = ['Skyline', 'Hacienda', 'Vault', 'Protocol', 'Red Card', 'Rewind']
    df = df[df['Map'].isin(ranked_maps)]
    
    df = df[df['Match Outcome'].isin(['win', 'loss'])]
    
    # Clean numeric columns
    numeric_columns = ['Kills', 'Deaths', 'Damage Done', 'Assists', 'Score', 
                      'Damage Taken', 'Hits', 'Shots', 'Skill', 'Percentage Of Time Moving']
    
    for col in numeric_columns:
        if col in df.columns:
            df[col] = clean_numeric_column(df[col])
    
    # Add derived features
    df['Kill_Death_Ratio'] = df['Kills'] / (df['Deaths'] + 1)
    df['Damage_Efficiency'] = df['Damage Done'] / (df['Damage Taken'] + 1)
    df['Accuracy'] = df['Hits'] / (df['Shots'] + 1)
    
    feature_columns = [
        'Kills', 'Deaths', 'Damage Done', 'Assists', 'Score',
        'Skill', 'Percentage Of Time Moving',
        'Kill_Death_Ratio', 'Damage_Efficiency', 'Accuracy'
    ]
    
    # Remove rows with NaN values in features
    df = df.dropna(subset=feature_columns)
    
    X = df[feature_columns].values
    y = df['Match Outcome'].values
    
    return X, y, feature_columns

def train_decision_tree(X_train, y_train, max_depth=5):
    """Train a decision tree classifier"""
    dt_classifier = DecisionTreeClassifier(
        max_depth=max_depth, 
        random_state=42,
        class_weight={'loss': 1.0, 'win': 2.0}
    )
    dt_classifier.fit(X_train, y_train)
    return dt_classifier

def evaluate_model(model, X_test, y_test):
    """Evaluate model and return metrics"""
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True)
    
    return {
        'accuracy': accuracy,
        'predictions': y_pred,
        'confusion_matrix': cm,
        'report': report
    }

def test_different_depths(X_train, y_train, X_test, y_test, depths=[1, 3, 5, 10, 15, 20]):
    """Test model with different tree depths"""
    accuracies = []
    for depth in depths:
        dt = DecisionTreeClassifier(
            max_depth=depth, 
            random_state=42,
            class_weight={'loss': 1.0, 'win': 2.0}
        )
        dt.fit(X_train, y_train)
        acc = accuracy_score(y_test, dt.predict(X_test))
        accuracies.append(acc)
    return accuracies

def save_model(model, feature_columns, filename='hardpoint_model.pkl'):
    """Save trained model to file"""
    model_data = {
        'model': model,
        'features': feature_columns
    }
    with open(filename, 'wb') as f:
        pickle.dump(model_data, f)

def export_model_stats_json(model, features, results, depths, depth_accuracies, 
                            X_train, X_test, y_train, y_test, filename='model_stats.json'):
    """Export model statistics in JSON format for web visualization"""
    import json
    
    cm = results['confusion_matrix']
    report = results['report']
    
    # Feature importance
    feature_importance = {}
    for i, feature in enumerate(features):
        feature_importance[feature] = float(model.feature_importances_[i])
    
    # Sort features by importance
    sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
    
    # Create exportable stats
    stats = {
        'model_info': {
            'algorithm': 'Decision Tree Classifier',
            'accuracy': float(results['accuracy']),
            'training_samples': len(X_train),
            'testing_samples': len(X_test),
            'tree_depth': int(model.get_depth()),
            'leaf_nodes': int(model.get_n_leaves()),
            'total_samples': len(X_train) + len(X_test)
        },
        'confusion_matrix': {
            'true_negatives': int(cm[0][0]),
            'false_positives': int(cm[0][1]),
            'false_negatives': int(cm[1][0]),
            'true_positives': int(cm[1][1]),
            'matrix': cm.tolist()
        },
        'classification_report': {
            'loss': {
                'precision': float(report['loss']['precision']),
                'recall': float(report['loss']['recall']),
                'f1_score': float(report['loss']['f1-score']),
                'support': int(report['loss']['support'])
            },
            'win': {
                'precision': float(report['win']['precision']),
                'recall': float(report['win']['recall']),
                'f1_score': float(report['win']['f1-score']),
                'support': int(report['win']['support'])
            },
            'accuracy': float(report['accuracy']),
            'macro_avg': {
                'precision': float(report['macro avg']['precision']),
                'recall': float(report['macro avg']['recall']),
                'f1_score': float(report['macro avg']['f1-score'])
            },
            'weighted_avg': {
                'precision': float(report['weighted avg']['precision']),
                'recall': float(report['weighted avg']['recall']),
                'f1_score': float(report['weighted avg']['f1-score'])
            }
        },
        'feature_importance': {
            'features': [{'name': name, 'importance': float(imp)} for name, imp in sorted_features],
            'top_feature': sorted_features[0][0],
            'top_importance': float(sorted_features[0][1])
        },
        'depth_analysis': {
            'depths': depths,
            'accuracies': [float(acc) for acc in depth_accuracies],
            'best_depth': int(depths[depth_accuracies.index(max(depth_accuracies))]),
            'best_accuracy': float(max(depth_accuracies))
        },
        'dataset_distribution': {
            'train_wins': int(np.sum(y_train == 'win')),
            'train_losses': int(np.sum(y_train == 'loss')),
            'test_wins': int(np.sum(y_test == 'win')),
            'test_losses': int(np.sum(y_test == 'loss'))
        }
    }
    
    # Save to JSON
    with open(filename, 'w') as f:
        json.dump(stats, f, indent=2)
    
    print(f"✓ Model statistics exported to {filename}")
    return stats

def export_model_stats_json(model, features, results, depths, depth_accuracies, 
                            X_train, X_test, y_train, y_test, filename='model_stats.json'):
    """Export model statistics in JSON format for web visualization"""
    
    cm = results['confusion_matrix']
    report = results['report']
    
    # Feature importance
    feature_importance = {}
    for i, feature in enumerate(features):
        feature_importance[feature] = float(model.feature_importances_[i])
    
    # Sort features by importance
    sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
    
    # Create exportable stats
    stats = {
        'model_info': {
            'algorithm': 'Decision Tree Classifier',
            'accuracy': float(results['accuracy']),
            'training_samples': len(X_train),
            'testing_samples': len(X_test),
            'tree_depth': int(model.get_depth()),
            'leaf_nodes': int(model.get_n_leaves()),
            'total_samples': len(X_train) + len(X_test)
        },
        'confusion_matrix': {
            'true_negatives': int(cm[0][0]),
            'false_positives': int(cm[0][1]),
            'false_negatives': int(cm[1][0]),
            'true_positives': int(cm[1][1]),
            'matrix': cm.tolist()
        },
        'classification_report': {
            'loss': {
                'precision': float(report['loss']['precision']),
                'recall': float(report['loss']['recall']),
                'f1_score': float(report['loss']['f1-score']),
                'support': int(report['loss']['support'])
            },
            'win': {
                'precision': float(report['win']['precision']),
                'recall': float(report['win']['recall']),
                'f1_score': float(report['win']['f1-score']),
                'support': int(report['win']['support'])
            },
            'accuracy': float(report['accuracy']),
            'macro_avg': {
                'precision': float(report['macro avg']['precision']),
                'recall': float(report['macro avg']['recall']),
                'f1_score': float(report['macro avg']['f1-score'])
            },
            'weighted_avg': {
                'precision': float(report['weighted avg']['precision']),
                'recall': float(report['weighted avg']['recall']),
                'f1_score': float(report['weighted avg']['f1-score'])
            }
        },
        'feature_importance': {
            'features': [{'name': name, 'importance': float(imp)} for name, imp in sorted_features],
            'top_feature': sorted_features[0][0],
            'top_importance': float(sorted_features[0][1])
        },
        'depth_analysis': {
            'depths': depths,
            'accuracies': [float(acc) for acc in depth_accuracies],
            'best_depth': int(depths[depth_accuracies.index(max(depth_accuracies))]),
            'best_accuracy': float(max(depth_accuracies))
        },
        'dataset_distribution': {
            'train_wins': int(np.sum(y_train == 'win')),
            'train_losses': int(np.sum(y_train == 'loss')),
            'test_wins': int(np.sum(y_test == 'win')),
            'test_losses': int(np.sum(y_test == 'loss'))
        }
    }
    
    # Save to JSON
    with open(filename, 'w') as f:
        json.dump(stats, f, indent=2)
    
    print(f"✓ Model statistics exported to {filename}")
    return stats

def main():
    """Main training pipeline"""
    print("Loading data...")
    X, y, feature_columns = load_and_prepare_data()
    
    print(f"Dataset loaded: {len(X)} samples with {len(feature_columns)} features")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print("Training model...")
    model = train_decision_tree(X_train, y_train, max_depth=5)
    
    print("Evaluating model...")
    results = evaluate_model(model, X_test, y_test)
    
    print("Testing different depths...")
    depths = [1, 3, 5, 10, 15, 20]
    depth_accuracies = test_different_depths(X_train, y_train, X_test, y_test, depths)
    
    # Save model
    print("Saving model...")
    save_model(model, feature_columns)
    
    # Export stats for web visualization
    print("Exporting statistics...")
    stats = export_model_stats_json(
        model, feature_columns, results, depths, depth_accuracies,
        X_train, X_test, y_train, y_test
    )
    
    # Print summary
    cm = results['confusion_matrix']
    print("\n" + "="*50)
    print("MODEL TRAINING COMPLETE")
    print("="*50)
    print(f"Accuracy: {results['accuracy']*100:.2f}%")
    print(f"Tree Depth: {model.get_depth()}")
    print(f"Leaf Nodes: {model.get_n_leaves()}")
    print(f"\nConfusion Matrix:")
    print(f"  True Negatives:  {cm[0][0]}")
    print(f"  False Positives: {cm[0][1]}")
    print(f"  False Negatives: {cm[1][0]}")
    print(f"  True Positives:  {cm[1][1]}")
    print(f"\nTop 3 Most Important Features:")
    for i, feat_dict in enumerate(stats['feature_importance']['features'][:3], 1):
        print(f"  {i}. {feat_dict['name']}: {feat_dict['importance']:.4f}")
    print("="*50)
    
    return stats

if __name__ == '__main__':
    stats = main()
