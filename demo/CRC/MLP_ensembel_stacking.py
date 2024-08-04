import numpy as np
import pandas as pd
from sklearn.model_selection import KFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_squared_error
from xgboost import XGBRegressor
from catboost import CatBoostRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

from sklearn.base import clone
from sklearn.model_selection import train_test_split

from CRC.MLP_nn import MoleculeDataset, MeltingPointMLP, train_model, load_data

# Reuse the MoleculeDataset and MeltingPointMLP classes from the previous example


class StackingEnsemble:
    def __init__(self, base_models, meta_model, n_splits=5):
        self.base_models = base_models
        self.meta_model = meta_model
        self.n_splits = n_splits

    def fit(self, X, y):
        self.base_models_ = [list() for _ in range(len(self.base_models))]
        self.meta_model_ = clone(self.meta_model)

        # Prepare out-of-fold predictions
        out_of_fold_predictions = np.zeros((X.shape[0], len(self.base_models)))

        # Prepare the kfold object
        kfold = KFold(n_splits=self.n_splits, shuffle=True, random_state=42)

        # Iterate through folds
        for fold, (train_idx, val_idx) in enumerate(kfold.split(X, y)):
            X_train_fold, X_val_fold = X[train_idx], X[val_idx]
            y_train_fold, y_val_fold = y[train_idx], y[val_idx]

            # Train and make predictions with base models
            for i, model in enumerate(self.base_models):
                if isinstance(model, MeltingPointMLP):
                    # Handle neural network differently
                    nn_model = self._train_neural_network(
                        X_train_fold, y_train_fold, X_val_fold, y_val_fold
                    )
                    self.base_models_[i].append(nn_model)
                    out_of_fold_predictions[val_idx, i] = self._predict_neural_network(
                        nn_model, X_val_fold
                    )
                else:
                    model_clone = clone(model)
                    model_clone.fit(X_train_fold, y_train_fold)
                    self.base_models_[i].append(model_clone)
                    out_of_fold_predictions[val_idx, i] = model_clone.predict(
                        X_val_fold
                    )

        # Train the meta-model
        self.meta_model_.fit(out_of_fold_predictions, y)

        # Retrain base models on the entire dataset
        for i, model in enumerate(self.base_models):
            if isinstance(model, MeltingPointMLP):
                nn_model = self._train_neural_network(
                    X, y, X, y
                )  # No separate validation set
                self.base_models_[i] = [nn_model]
            else:
                model_clone = clone(model)
                model_clone.fit(X, y)
                self.base_models_[i] = [model_clone]

        return self

    def predict(self, X):
        meta_features = np.column_stack(
            [
                self._predict_base_model(X, self.base_models_[i][0])
                for i in range(len(self.base_models))
            ]
        )
        return self.meta_model_.predict(meta_features)

    def _train_neural_network(self, X_train, y_train, X_val, y_val):
        # Implement neural network training similar to the previous example
        # You may want to use the best hyperparameters found earlier
        model = MeltingPointMLP(
            input_dim=X_train.shape[1], hidden_dim=128, dropout_rate=0.3
        )
        optimizer = optim.Adam(model.parameters(), lr=0.001)
        criterion = nn.MSELoss()

        train_dataset = MoleculeDataset(X_train, y_train)
        val_dataset = MoleculeDataset(X_val, y_val)
        train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=32)

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        return train_model(
            model, train_loader, val_loader, optimizer, criterion, device
        )

    def _predict_neural_network(self, model, X):
        model.eval()
        with torch.no_grad():
            X_tensor = torch.tensor(X, dtype=torch.float32)
            return model(X_tensor).numpy().flatten()

    def _predict_base_model(self, X, model):
        if isinstance(model, MeltingPointMLP):
            return self._predict_neural_network(model, X)
        else:
            return model.predict(X)


# Main execution
if __name__ == "__main__":
    # Assume X is your VICGAE embeddings and y is your melting point data
    X, y = load_data()
    print(X.shape, y.shape, "data loaded")

    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(X_train.shape, X_test.shape, y_train.shape, y_test.shape, "data split")

    # Scale the features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    print(X_train_scaled.shape, X_test_scaled.shape, "data scaled")

    # Define base models
    base_models = [
        XGBRegressor(n_estimators=100, random_state=42),
        CatBoostRegressor(iterations=100, random_state=42, verbose=False),
        RandomForestRegressor(n_estimators=100, random_state=42),
        MeltingPointMLP(input_dim=32, hidden_dim=128, dropout_rate=0.3),
    ]

    # Define meta-model
    meta_model = LinearRegression()

    # Create and train the stacking ensemble
    stacking_ensemble = StackingEnsemble(base_models, meta_model)
    print("stacking ensemble created")
    print("start training stacking ensemble")
    stacking_ensemble.fit(X_train_scaled, y_train)
    print("stacking ensemble trained")

    # Make predictions on the test set
    y_pred = stacking_ensemble.predict(X_test_scaled)
    print("predictions made")

    # Calculate performance metrics
    print("calculating performance metrics")
    r2 = r2_score(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))

    print(f"Stacking Ensemble - Test R² score: {r2}")
    print(f"Stacking Ensemble - Test RMSE: {rmse}")
