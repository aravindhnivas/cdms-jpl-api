import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_squared_error
import numpy as np
import optuna
import pandas as pd
from pathlib import Path as pt


# Custom dataset
class MoleculeDataset(Dataset):
    def __init__(self, X, y):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y = torch.tensor(y, dtype=torch.float32).reshape(-1, 1)

    def __len__(self):
        return len(self.y)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


# Neural Network model
class MeltingPointMLP(nn.Module):
    def __init__(self, input_dim, hidden_dim, dropout_rate):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        self.fc3 = nn.Linear(hidden_dim, 1)
        self.dropout = nn.Dropout(dropout_rate)
        self.relu = nn.ReLU()

    def forward(self, x):
        x = self.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.relu(self.fc2(x))
        x = self.dropout(x)
        return self.fc3(x)


# Training function
def train_model(
    model,
    train_loader,
    val_loader,
    optimizer,
    criterion,
    device,
    epochs=100,
    early_stopping_patience=10,
):
    model.to(device)
    best_val_loss = float("inf")
    patience_counter = 0

    for epoch in range(epochs):
        model.train()
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

        # Validation
        model.eval()
        val_loss = 0
        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                val_loss += criterion(outputs, targets).item()

        val_loss /= len(val_loader)

        # Early stopping
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= early_stopping_patience:
                print(f"Early stopping at epoch {epoch}")
                break

    return model


# Objective function for Optuna
def objective(trial):
    # Hyperparameters to optimize
    hidden_dim = trial.suggest_int("hidden_dim", 32, 256)
    dropout_rate = trial.suggest_float("dropout_rate", 0.1, 0.5)
    learning_rate = trial.suggest_float("learning_rate", 1e-5, 1e-2, log=True)
    batch_size = trial.suggest_categorical("batch_size", [16, 32, 64, 128])

    # Create model, optimizer, and criterion
    model = MeltingPointMLP(
        input_dim=32, hidden_dim=hidden_dim, dropout_rate=dropout_rate
    )
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    criterion = nn.MSELoss()

    # Create data loaders
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size)

    # Train the model
    trained_model = train_model(
        model, train_loader, val_loader, optimizer, criterion, device
    )

    # Evaluate the model
    trained_model.eval()
    val_predictions = []
    val_targets = []
    with torch.no_grad():
        for inputs, targets in val_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            outputs = trained_model(inputs)
            val_predictions.extend(outputs.cpu().numpy())
            val_targets.extend(targets.cpu().numpy())

    val_r2 = r2_score(val_targets, val_predictions)
    return val_r2


def load_data():
    # Load your data here
    # loc = pt("/Users/aravindhnivas/Documents/code-testing/ML properties/")
    loc = pt("/Users/aravindhnivas/Documents/test-codes/umda/ML properties/")
    mp_csv_file = loc / "melting_points_updated.csv"

    df = pd.read_csv(mp_csv_file, index_col=0)
    y = df["MP (processed)"].values

    embedding_file = loc / "melting_points_updated_SMILES_VICGAE_embeddings.npy"
    X = np.load(embedding_file, allow_pickle=True)

    invalid_indices = [i for i, arr in enumerate(X) if np.any(arr == 0)]
    valid_mask = np.ones(len(X), dtype=bool)  # Initially, mark all as valid
    valid_mask[invalid_indices] = False  # Mark invalid indices as False
    X = X[valid_mask]
    y = y[valid_mask]
    return X, y


# Main execution
if __name__ == "__main__":
    # Assume X is your VICGAE embeddings and y is your melting point data
    X, y = load_data()

    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train, y_train, test_size=0.2, random_state=42
    )

    # Scale the features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    # Create datasets
    train_dataset = MoleculeDataset(X_train_scaled, y_train)
    val_dataset = MoleculeDataset(X_val_scaled, y_val)
    test_dataset = MoleculeDataset(X_test_scaled, y_test)

    # Set device
    # Check if MPS is available
    if torch.backends.mps.is_available():
        device = torch.device("mps")
    else:
        device = torch.device("cpu")

    print(f"Using device: {device}")
    # device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # Hyperparameter optimization
    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=100, n_jobs=-1)

    # Get the best hyperparameters
    best_params = study.best_params

    # Train the final model with the best hyperparameters
    best_model = MeltingPointMLP(
        input_dim=32,
        hidden_dim=best_params["hidden_dim"],
        dropout_rate=best_params["dropout_rate"],
    )
    best_optimizer = optim.Adam(
        best_model.parameters(), lr=best_params["learning_rate"]
    )
    criterion = nn.MSELoss()

    train_loader = DataLoader(
        train_dataset, batch_size=best_params["batch_size"], shuffle=True, num_workers=4
    )
    val_loader = DataLoader(val_dataset, batch_size=best_params["batch_size"])

    final_model = train_model(
        best_model, train_loader, val_loader, best_optimizer, criterion, device
    )

    # Evaluate on test set
    test_loader = DataLoader(test_dataset, batch_size=best_params["batch_size"])
    final_model.eval()
    test_predictions = []
    test_targets = []
    with torch.no_grad():
        for inputs, targets in test_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            outputs = final_model(inputs)
            test_predictions.extend(outputs.cpu().numpy())
            test_targets.extend(targets.cpu().numpy())

    test_r2 = r2_score(test_targets, test_predictions)
    test_rmse = np.sqrt(mean_squared_error(test_targets, test_predictions))

    print(f"Test R² score: {test_r2}")
    print(f"Test RMSE: {test_rmse}")
