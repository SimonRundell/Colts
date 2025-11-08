/**
 * @file apiHelpers.js
 * @description Utility functions for handling API responses (legacy)
 * @module utils/apiHelpers
 * 
 * @deprecated This file contains legacy API response handlers from the old
 * axios-based architecture. New code should use authHelpers.js functions
 * (crudRequest, publicRead) instead. These utilities may be used in older
 * components that haven't been migrated yet.
 */

/**
 * Parses the standard backend response format
 * @deprecated Use authHelpers.crudRequest or publicRead instead
 * @param {Object} responseData - The response data from axios: {message: "JSON_STRING", status_code: 200}
 * @param {Function} setSendSuccessMessage - Success message setter function
 * @param {Function} setSendErrorMessage - Error message setter function
 * @param {string} [successMessage='Data loaded successfully'] - Message to show on success
 * @param {string} [errorMessage='Failed to load data'] - Message to show on error
 * @returns {Object|Array|string|null} Parsed data or null if error
 */
export const parseApiResponse = (
    responseData, 
    setSendSuccessMessage, 
    setSendErrorMessage, 
    successMessage = 'Data loaded successfully', 
    errorMessage = 'Failed to load data'
) => {
    try {
        if (responseData.status_code === 200) {
            let parsedData;
            
            // Try to parse as JSON first, if it fails treat as plain string
            try {
                parsedData = JSON.parse(responseData.message);
            } catch (jsonError) {
                // If JSON parsing fails, treat as plain string response
                // console.log(jsonError)
                parsedData = responseData.message;
            }
            
            if (setSendSuccessMessage) {
                setSendSuccessMessage(successMessage);
            }
            return parsedData;
        } else {
            if (setSendErrorMessage) {
                setSendErrorMessage(errorMessage);
            }
            return null;
        }
    } catch (parseError) {
        console.error('Error parsing API response:', parseError);
        if (setSendErrorMessage) {
            setSendErrorMessage('Error parsing server response');
        }
        return null;
    }
};

/**
 * Handles common API call pattern with loading state and error handling
 * @deprecated Use authHelpers.crudRequest or publicRead instead
 * @async
 * @param {Function} apiCall - The axios API call function
 * @param {Function} setData - Function to set the parsed data
 * @param {Function} setIsLoading - Loading state setter
 * @param {Function} setSendSuccessMessage - Success message setter
 * @param {Function} setSendErrorMessage - Error message setter
 * @param {string} [successMessage='Data loaded successfully'] - Success message
 * @param {string} [errorMessage='Failed to load data'] - Error message
 */
export const handleApiCall = async (
    apiCall,
    setData,
    setIsLoading,
    setSendSuccessMessage,
    setSendErrorMessage,
    successMessage = 'Data loaded successfully',
    errorMessage = 'Failed to load data'
) => {
    setIsLoading(true);
    try {
        const response = await apiCall();
        const parsedData = parseApiResponse(
            response.data,
            setSendSuccessMessage,
            setSendErrorMessage,
            successMessage,
            errorMessage
        );
        
        if (parsedData !== null) {
            setData(parsedData);
        }
    } catch (error) {
        console.error('API call error:', error);
        setSendErrorMessage('Network error. Please try again.');
    } finally {
        setIsLoading(false);
    }
};